mod common;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
fn main() -> Result<(), Box<dyn std::error::Error>> {
    linux::run()
}

#[cfg(target_os = "windows")]
fn main() -> Result<(), Box<dyn std::error::Error>> {
    windows::run()
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
compile_error!("The native Now Playing watcher currently supports Windows and Linux.");
