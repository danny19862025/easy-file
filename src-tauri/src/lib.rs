mod commands;
mod error;
mod models;
mod protocols;
mod services;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .register_uri_scheme_protocol("localfile", |_ctx, request| {
            protocols::media::handle_localfile_protocol(request)
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_directory_stream,
            commands::watch_directory,
            commands::unwatch_directory,
            commands::get_user_dirs,
            commands::list_mounts,
            commands::create_dir,
            commands::create_file,
            commands::rename_entry,
            commands::move_to_trash,
            commands::delete_permanent,
            commands::copy_entries,
            commands::move_entries,
            commands::read_preview,
            commands::open_with_default,
            commands::analyze_disk_usage,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::close_pty,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Easy File");
}
