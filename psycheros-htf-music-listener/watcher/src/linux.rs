use crate::common::{
    POLL_INTERVAL, Snapshot, choose_snapshot, closed_snapshot, emit, nonempty, now_ms, report_error,
};
use std::collections::HashMap;
use std::thread;
use zbus::blocking::{Connection, Proxy};
use zbus::zvariant::OwnedValue;

const MPRIS_PREFIX: &str = "org.mpris.MediaPlayer2.";
const MPRIS_PATH: &str = "/org/mpris/MediaPlayer2";
const MPRIS_PLAYER_INTERFACE: &str = "org.mpris.MediaPlayer2.Player";

fn status_name(status: &str) -> String {
    match status {
        "Playing" => "playing",
        "Paused" => "paused",
        "Stopped" => "stopped",
        _ => "unknown",
    }
    .to_owned()
}

fn metadata_string(metadata: &HashMap<String, OwnedValue>, key: &str) -> Option<String> {
    metadata
        .get(key)
        .and_then(|value| String::try_from(value.clone()).ok())
        .and_then(nonempty)
}

fn metadata_artist(metadata: &HashMap<String, OwnedValue>) -> Option<String> {
    let artists = metadata
        .get("xesam:artist")
        .and_then(|value| Vec::<String>::try_from(value.clone()).ok())?;
    nonempty(artists.join(", "))
}

fn metadata_duration_ms(metadata: &HashMap<String, OwnedValue>) -> Option<i64> {
    let microseconds = metadata
        .get("mpris:length")
        .and_then(|value| i64::try_from(value).ok())?;
    Some((microseconds / 1000).max(0))
}

fn read_snapshot(connection: &Connection, service: &str) -> zbus::Result<Snapshot> {
    let proxy = Proxy::new(connection, service, MPRIS_PATH, MPRIS_PLAYER_INTERFACE)?;
    let status: String = proxy.get_property("PlaybackStatus")?;
    let metadata: HashMap<String, OwnedValue> = proxy.get_property("Metadata")?;
    let position_us: Option<i64> = proxy.get_property("Position").ok();
    Ok(Snapshot {
        captured_at_ms: now_ms(),
        source_app_id: Some(service.to_owned()),
        title: metadata_string(&metadata, "xesam:title"),
        artist: metadata_artist(&metadata),
        album: metadata_string(&metadata, "xesam:album"),
        position_ms: position_us.map(|value| (value / 1000).max(0)),
        duration_ms: metadata_duration_ms(&metadata),
        playback_status: status_name(&status),
    })
}

fn list_player_services(connection: &Connection) -> zbus::fdo::Result<Vec<String>> {
    let proxy = zbus::blocking::fdo::DBusProxy::new(connection)?;
    Ok(proxy
        .list_names()?
        .into_iter()
        .map(|name| name.to_string())
        .filter(|name| name.starts_with(MPRIS_PREFIX))
        .collect())
}

pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let connection = Connection::session()?;
    let mut previous_source: Option<String> = None;
    let mut had_session = false;
    let mut last_error = None;
    loop {
        match list_player_services(&connection) {
            Ok(services) => {
                let snapshots = services.into_iter().filter_map(|service| {
                    match read_snapshot(&connection, &service) {
                        Ok(snapshot) => Some(snapshot),
                        Err(error) => {
                            report_error(&mut last_error, &format!("MPRIS {service}"), &error);
                            None
                        }
                    }
                });
                if let Some(snapshot) = choose_snapshot(snapshots, previous_source.as_deref()) {
                    previous_source = snapshot.source_app_id.clone();
                    emit(&snapshot);
                    had_session = true;
                } else if had_session {
                    emit(&closed_snapshot());
                    previous_source = None;
                    had_session = false;
                }
            }
            Err(error) => report_error(&mut last_error, "MPRIS discovery", &error),
        }
        thread::sleep(POLL_INTERVAL);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mpris_statuses_are_normalized() {
        assert_eq!(status_name("Playing"), "playing");
        assert_eq!(status_name("Paused"), "paused");
        assert_eq!(status_name("Stopped"), "stopped");
        assert_eq!(status_name("Unexpected"), "unknown");
    }
}
