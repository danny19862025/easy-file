use std::fs;
use std::path::PathBuf;

use tauri::http::{header, Request, Response, StatusCode};

/// Serves local files directly over `localfile://localhost/?path=<url-encoded-path>`
/// for zero-JSON image thumbnails, PDF previews, and audio playback.
pub fn handle_localfile_protocol(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let query = request.uri().query().unwrap_or_default();
    let encoded_path = query
        .split('&')
        .find_map(|kv| kv.strip_prefix("path="))
        .unwrap_or_default();

    let Ok(decoded) = urlencoding::decode(encoded_path) else {
        return error_response(StatusCode::BAD_REQUEST, "Invalid path encoding");
    };

    let path = PathBuf::from(decoded.as_ref());
    if !path.is_absolute() {
        return error_response(StatusCode::FORBIDDEN, "Path must be absolute");
    }

    match fs::read(&path) {
        Ok(bytes) => {
            let mime = mime_guess::from_path(&path)
                .first_or_octet_stream()
                .essence_str()
                .to_string();

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime)
                .header(header::CACHE_CONTROL, "max-age=60")
                .body(bytes)
                .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "Response error"))
        }
        Err(_) => error_response(StatusCode::NOT_FOUND, "File not readable"),
    }
}

fn error_response(status: StatusCode, msg: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(msg.as_bytes().to_vec())
        .unwrap()
}
