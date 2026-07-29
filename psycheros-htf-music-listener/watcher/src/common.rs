use serde::Serialize;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const POLL_INTERVAL: Duration = Duration::from_millis(750);
const ERROR_REPEAT_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub captured_at_ms: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_app_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artist: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub album: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    pub playback_status: String,
}

pub fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub fn nonempty(value: impl Into<String>) -> Option<String> {
    let value = value.into();
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else if trimmed.len() == value.len() {
        Some(value)
    } else {
        Some(trimmed.to_owned())
    }
}

pub fn status_rank(status: &str) -> u8 {
    match status {
        "playing" => 3,
        "paused" => 2,
        "stopped" => 1,
        _ => 0,
    }
}

pub fn choose_snapshot(
    snapshots: impl IntoIterator<Item = Snapshot>,
    previous_source: Option<&str>,
) -> Option<Snapshot> {
    snapshots.into_iter().max_by(|left, right| {
        status_rank(&left.playback_status)
            .cmp(&status_rank(&right.playback_status))
            .then_with(|| {
                let left_previous = left.source_app_id.as_deref() == previous_source;
                let right_previous = right.source_app_id.as_deref() == previous_source;
                left_previous.cmp(&right_previous)
            })
            .then_with(|| right.source_app_id.cmp(&left.source_app_id))
    })
}

pub fn emit(snapshot: &Snapshot) {
    if let Ok(line) = serde_json::to_string(snapshot) {
        println!("{line}");
    }
}

pub fn closed_snapshot() -> Snapshot {
    Snapshot {
        captured_at_ms: now_ms(),
        source_app_id: None,
        title: None,
        artist: None,
        album: None,
        position_ms: None,
        duration_ms: None,
        playback_status: "closed".to_owned(),
    }
}

pub fn report_error(
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

#[cfg(test)]
mod tests {
    use super::*;

    fn snapshot(source: &str, status: &str) -> Snapshot {
        Snapshot {
            captured_at_ms: 1,
            source_app_id: Some(source.to_owned()),
            title: Some(format!("{source} track")),
            artist: None,
            album: None,
            position_ms: Some(0),
            duration_ms: Some(1000),
            playback_status: status.to_owned(),
        }
    }

    #[test]
    fn playing_beats_paused_and_stopped() {
        let selected = choose_snapshot(
            [
                snapshot("paused-player", "paused"),
                snapshot("playing-player", "playing"),
                snapshot("stopped-player", "stopped"),
            ],
            None,
        )
        .unwrap();
        assert_eq!(selected.source_app_id.as_deref(), Some("playing-player"));
    }

    #[test]
    fn previous_source_wins_equal_status_to_avoid_flicker() {
        let selected = choose_snapshot(
            [
                snapshot("first-player", "paused"),
                snapshot("previous-player", "paused"),
            ],
            Some("previous-player"),
        )
        .unwrap();
        assert_eq!(selected.source_app_id.as_deref(), Some("previous-player"));
    }

    #[test]
    fn lexical_source_order_is_deterministic_without_a_previous_source() {
        let selected = choose_snapshot(
            [
                snapshot("z-player", "paused"),
                snapshot("a-player", "paused"),
            ],
            None,
        )
        .unwrap();
        assert_eq!(selected.source_app_id.as_deref(), Some("a-player"));
    }
}
