use serde::Serialize;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

const POLL_INTERVAL: Duration = Duration::from_millis(750);
const ERROR_REPEAT_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    captured_at_ms: u128,
    source_app_id: String,
    title: String,
    artist: String,
    album: String,
    position_ms: i64,
    duration_ms: i64,
    playback_status: &'static str,
}

fn millis(ticks_100ns: i64) -> i64 {
    ticks_100ns / 10_000
}

fn status_name(status: GlobalSystemMediaTransportControlsSessionPlaybackStatus) -> &'static str {
    use GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status;
    if status == Status::Playing {
        "playing"
    } else if status == Status::Paused {
        "paused"
    } else if status == Status::Stopped {
        "stopped"
    } else if status == Status::Changing {
        "changing"
    } else if status == Status::Closed {
        "closed"
    } else if status == Status::Opened {
        "opened"
    } else {
        "unknown"
    }
}

fn read_snapshot(
    session: &GlobalSystemMediaTransportControlsSession,
) -> windows::core::Result<Snapshot> {
    let media = session.TryGetMediaPropertiesAsync()?.join()?;
    let timeline = session.GetTimelineProperties()?;
    let playback = session.GetPlaybackInfo()?;
    Ok(Snapshot {
        captured_at_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        source_app_id: session.SourceAppUserModelId()?.to_string_lossy(),
        title: media.Title()?.to_string_lossy(),
        artist: media.Artist()?.to_string_lossy(),
        album: media.AlbumTitle()?.to_string_lossy(),
        position_ms: millis(timeline.Position()?.Duration),
        duration_ms: millis(timeline.EndTime()?.Duration),
        playback_status: status_name(playback.PlaybackStatus()?),
    })
}

fn is_missing_current_session(error: &windows::core::Error) -> bool {
    // Windows returns a null session with S_OK when no media app currently owns
    // the GlobalSystemMediaTransportControls session. windows-rs represents
    // that null WinRT interface as an Error whose HRESULT is still successful.
    // It is an ordinary "nothing is playing" state, not a failure.
    error.code().is_ok()
}

fn emit_closed(last_identity: &mut String) {
    if last_identity.is_empty() {
        return;
    }
    println!(
        "{}",
        serde_json::json!({
            "capturedAtMs": SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            "playbackStatus": "closed"
        })
    );
    last_identity.clear();
}

fn report_error(
    last_error: &mut Option<(String, Instant)>,
    context: &str,
    error: &impl std::fmt::Display,
) {
    let message = format!("now-playing {context} error: {error}");
    let now = Instant::now();
    let should_report = last_error.as_ref().is_none_or(|(previous, at)| {
        previous != &message || now.duration_since(*at) >= ERROR_REPEAT_INTERVAL
    });
    if should_report {
        eprintln!("{message}");
        *last_error = Some((message, now));
    }
}

fn main() -> windows::core::Result<()> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.join()?;
    let mut last_identity = String::new();
    let mut last_error = None;
    loop {
        match manager.GetCurrentSession() {
            Ok(session) => match read_snapshot(&session) {
                Ok(snapshot) => {
                    let identity = format!(
                        "{}\u{1f}{}\u{1f}{}\u{1f}{}",
                        snapshot.source_app_id,
                        snapshot.title,
                        snapshot.artist,
                        snapshot.playback_status
                    );
                    if !snapshot.title.is_empty() {
                        if let Ok(line) = serde_json::to_string(&snapshot) {
                            println!("{line}");
                        }
                        last_identity = identity;
                    }
                }
                Err(error) => report_error(&mut last_error, "read", &error),
            },
            Err(error) => {
                emit_closed(&mut last_identity);
                if !is_missing_current_session(&error) {
                    report_error(&mut last_error, "session", &error);
                }
            }
        }
        thread::sleep(POLL_INTERVAL);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn successful_hresult_means_no_current_session() {
        let error = windows::core::Error::from_hresult(windows::core::HRESULT(0));
        assert!(is_missing_current_session(&error));
    }

    #[test]
    fn failing_hresult_remains_an_error() {
        let error = windows::core::Error::from_hresult(windows::core::HRESULT(-1));
        assert!(!is_missing_current_session(&error));
    }
}
