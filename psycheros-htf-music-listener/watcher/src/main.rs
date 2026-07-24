use serde::Serialize;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

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

fn main() -> windows::core::Result<()> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.join()?;
    let mut last_identity = String::new();
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
                Err(error) => eprintln!("now-playing read error: {error}"),
            },
            Err(error) => {
                if !last_identity.is_empty() {
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
                eprintln!("now-playing session error: {error}");
            }
        }
        thread::sleep(Duration::from_millis(750));
    }
}
