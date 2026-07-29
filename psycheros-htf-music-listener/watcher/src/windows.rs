use crate::common::{
    POLL_INTERVAL, Snapshot, closed_snapshot, emit, nonempty, now_ms, report_error,
};
use std::thread;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

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
        captured_at_ms: now_ms(),
        source_app_id: nonempty(session.SourceAppUserModelId()?.to_string_lossy()),
        title: nonempty(media.Title()?.to_string_lossy()),
        artist: nonempty(media.Artist()?.to_string_lossy()),
        album: nonempty(media.AlbumTitle()?.to_string_lossy()),
        position_ms: Some(millis(timeline.Position()?.Duration).max(0)),
        duration_ms: Some(millis(timeline.EndTime()?.Duration).max(0)),
        playback_status: status_name(playback.PlaybackStatus()?).to_owned(),
    })
}

fn is_missing_current_session(error: &windows::core::Error) -> bool {
    // Windows returns a null session with S_OK when no media app currently owns
    // the GlobalSystemMediaTransportControls session. windows-rs represents
    // that null WinRT interface as an Error whose HRESULT is still successful.
    // It is an ordinary "nothing is playing" state, not a failure.
    error.code().is_ok()
}

pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.join()?;
    let mut had_session = false;
    let mut last_error = None;
    loop {
        match manager.GetCurrentSession() {
            Ok(session) => match read_snapshot(&session) {
                Ok(snapshot) => {
                    if snapshot.title.is_some() {
                        emit(&snapshot);
                        had_session = true;
                    }
                }
                Err(error) => report_error(&mut last_error, "read", &error),
            },
            Err(error) => {
                if had_session {
                    emit(&closed_snapshot());
                    had_session = false;
                }
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
