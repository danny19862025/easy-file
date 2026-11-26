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
        .setup(|app| {
            services::cloud_sync::start_autosync_scheduler(app.handle().clone());
            Ok(())
        })
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
            commands::fuzzy_search,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::close_pty,
            commands::check_network_tools,
            commands::list_network_bookmarks,
            commands::connect_network,
            commands::unmount_network,
            commands::remove_network_bookmark,
            commands::list_cloud_remotes,
            commands::mount_cloud_remote,
            commands::unmount_cloud_remote,
            commands::list_sync_rules,
            commands::add_sync_rule,
            commands::toggle_sync_rule,
            commands::delete_sync_rule,
            commands::run_sync_rule_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Easy File");
}
