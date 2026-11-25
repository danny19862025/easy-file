#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Work around WebKitGTK 2.42+ DMABUF blank-window rendering bug on Linux (Wayland/NVIDIA/Mesa)
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // SAFETY: Called at startup before any threads or GTK/WebKit are initialized.
        unsafe {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    easy_file_lib::run();
}
