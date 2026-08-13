use arboard::{Clipboard, ImageData};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use image::{DynamicImage, ImageFormat, RgbaImage};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::{
    borrow::Cow,
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    io::Cursor,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicI64, AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Runtime, Size, State,
    WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as AutostartExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const APP_NAME: &str = "CopyBoard";
const HISTORY_FILE: &str = "clipboard-history.json";
const IMAGES_DIR: &str = "clipboard-images";
const SETTINGS_FILE: &str = "settings.json";
const FAVORITES_FILE: &str = "frequent-items.json";
const MAX_TEXT_CHARS: usize = 750_000;
const MAX_IMAGE_CHARS: usize = 40_000_000;
const POLL_MS: u64 = 420;
const DEFAULT_SUPPRESS_MS: i64 = 4_000;
const QUICK_ACCESS_LABEL: &str = "quick-access";
const QUICK_ACCESS_HEIGHT: f64 = 280.0;
const QUICK_ACCESS_HOT_ZONE: f64 = 8.0;

struct ClipboardRuntime {
    running: Arc<AtomicBool>,
    generation: Arc<AtomicU64>,
    suppress_until: Arc<AtomicI64>,
    last_text: Arc<Mutex<String>>,
    last_image_key: Arc<Mutex<String>>,
}

impl Default for ClipboardRuntime {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            generation: Arc::new(AtomicU64::new(0)),
            suppress_until: Arc::new(AtomicI64::new(0)),
            last_text: Arc::new(Mutex::new(String::new())),
            last_image_key: Arc::new(Mutex::new(String::new())),
        }
    }
}

struct RuntimeState {
    data_dir: PathBuf,
    settings: Mutex<Value>,
    clipboard: ClipboardRuntime,
    quitting: AtomicBool,
    initial_hidden: AtomicBool,
    quick_access_animation: Arc<AtomicU64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HotkeysInput {
    quick_access: Option<String>,
    clear_all: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeysSnapshot {
    quick_access: String,
    clear_all: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AutoStartSnapshot {
    open_at_login: bool,
    open_as_hidden: bool,
    was_opened_at_login: bool,
    was_opened_as_hidden: bool,
}

#[derive(Clone, Serialize)]
struct ClipboardCapture {
    #[serde(rename = "type")]
    kind: String,
    content: String,
    timestamp: String,
}

fn defaults() -> Value {
    json!({
        "language": "ru",
        "startMinimized": false,
        "closeBehavior": "minimize",
        "autoStart": false,
        "showTrayNotifications": true,
        "quickAccessHotkey": "Ctrl+Shift+V",
        "clearAllHotkey": "Ctrl+Shift+Delete",
        "viewMode": "list",
        "theme": "system",
        "maxItems": 100,
        "autoDelete": "never"
    })
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn merge_settings(base: &mut Value, partial: Value) {
    let Some(target) = base.as_object_mut() else {
        *base = defaults();
        return merge_settings(base, partial);
    };
    if let Some(update) = partial.as_object() {
        for (key, value) in update {
            if key != "monitorClipboard" && key != "saveOnClose" {
                target.insert(key.clone(), value.clone());
            }
        }
    }
    target.remove("monitorClipboard");
    target.remove("saveOnClose");
}

fn load_json(path: &Path, fallback: Value) -> Value {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or(fallback)
}

fn save_json(path: &Path, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn settings_path(state: &RuntimeState) -> PathBuf {
    state.data_dir.join(SETTINGS_FILE)
}

fn history_path(state: &RuntimeState) -> PathBuf {
    state.data_dir.join(HISTORY_FILE)
}

fn images_dir(state: &RuntimeState) -> PathBuf {
    state.data_dir.join(IMAGES_DIR)
}

fn favorites_path(state: &RuntimeState) -> PathBuf {
    state.data_dir.join(FAVORITES_FILE)
}

fn setting_string(settings: &Value, key: &str, fallback: &str) -> String {
    settings
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or(fallback)
        .to_string()
}

fn setting_bool(settings: &Value, key: &str, fallback: bool) -> bool {
    settings
        .get(key)
        .and_then(Value::as_bool)
        .unwrap_or(fallback)
}

fn load_settings_file(data_dir: &Path) -> Value {
    let mut settings = defaults();
    let stored = load_json(&data_dir.join(SETTINGS_FILE), json!({}));
    merge_settings(&mut settings, stored);
    settings
}

fn migrate_legacy_data(data_dir: &Path) {
    if fs::create_dir_all(data_dir).is_err() {
        return;
    }
    let Some(parent) = data_dir.parent() else {
        return;
    };

    let legacy_candidates = [
        parent.join("CopyBoard"),
        parent.join("copyboard"),
        parent.join("com.copyboard.app"),
    ];
    for legacy in legacy_candidates {
        if legacy == data_dir || !legacy.is_dir() {
            continue;
        }
        for name in [SETTINGS_FILE, HISTORY_FILE, FAVORITES_FILE] {
            let source = legacy.join(name);
            let destination = data_dir.join(name);
            if source.is_file() && !destination.exists() {
                let _ = fs::copy(source, destination);
            }
        }

        let source_images = legacy.join(IMAGES_DIR);
        let destination_images = data_dir.join(IMAGES_DIR);
        if source_images.is_dir() {
            let _ = fs::create_dir_all(&destination_images);
            if let Ok(entries) = fs::read_dir(source_images) {
                for entry in entries.flatten() {
                    let source = entry.path();
                    let destination = destination_images.join(entry.file_name());
                    if source.is_file() && !destination.exists() {
                        let _ = fs::copy(source, destination);
                    }
                }
            }
        }
        break;
    }
}

fn safe_image_name(raw: &str) -> String {
    if !raw.is_empty()
        && raw.len() <= 128
        && raw
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return raw.to_string();
    }
    let mut hasher = DefaultHasher::new();
    raw.hash(&mut hasher);
    format!("image-{:x}", hasher.finish())
}

fn hydrate_history_item(item: &mut Value, image_root: &Path) {
    let Some(object) = item.as_object_mut() else {
        return;
    };
    if object.get("type").and_then(Value::as_str) != Some("image") {
        return;
    }
    if object
        .get("content")
        .and_then(Value::as_str)
        .is_some_and(|content| !content.is_empty())
    {
        return;
    }
    let Some(image_file) = object.get("imageFile").and_then(Value::as_str) else {
        return;
    };
    let image_path = image_root.join(format!("{}.txt", safe_image_name(image_file)));
    if let Ok(content) = fs::read_to_string(image_path) {
        object.insert("content".into(), Value::String(content));
    }
}

fn serialize_history_item(item: &Value, image_root: &Path) -> Value {
    let mut serialized = item.clone();
    let Some(object) = serialized.as_object_mut() else {
        return serialized;
    };
    let is_image = object.get("type").and_then(Value::as_str) == Some("image");
    let content = object
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    if !is_image || !content.starts_with("data:image/") {
        return serialized;
    }
    let id = object
        .get("id")
        .and_then(Value::as_str)
        .map(safe_image_name)
        .unwrap_or_else(|| safe_image_name(&content[..content.len().min(256)]));
    let _ = fs::create_dir_all(image_root);
    if fs::write(image_root.join(format!("{id}.txt")), content).is_ok() {
        object.insert("content".into(), Value::String(String::new()));
        object.insert("imageFile".into(), Value::String(id));
    }
    serialized
}

fn history_load_inner(state: &RuntimeState) -> Vec<Value> {
    let mut items = load_json(&history_path(state), json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default();
    let image_root = images_dir(state);
    for item in &mut items {
        hydrate_history_item(item, &image_root);
    }
    items
}

fn history_save_inner(state: &RuntimeState, items: &[Value]) -> Result<(), String> {
    let image_root = images_dir(state);
    let serialized = items
        .iter()
        .map(|item| serialize_history_item(item, &image_root))
        .collect::<Vec<_>>();
    save_json(&history_path(state), &Value::Array(serialized))
}

fn image_fingerprint(image: &ImageData<'_>) -> String {
    let bytes = image.bytes.as_ref();
    let mut hasher = DefaultHasher::new();
    image.width.hash(&mut hasher);
    image.height.hash(&mut hasher);
    bytes.len().hash(&mut hasher);
    let chunk = bytes.len().min(16_384);
    bytes[..chunk].hash(&mut hasher);
    if bytes.len() > chunk {
        let middle = bytes.len() / 2;
        let start = middle.saturating_sub(chunk / 2);
        bytes[start..(start + chunk).min(bytes.len())].hash(&mut hasher);
        bytes[bytes.len() - chunk..].hash(&mut hasher);
    }
    format!("{}x{}:{:x}", image.width, image.height, hasher.finish())
}

fn image_to_data_url(image: &ImageData<'_>) -> Result<String, String> {
    let rgba = RgbaImage::from_raw(
        image.width as u32,
        image.height as u32,
        image.bytes.as_ref().to_vec(),
    )
    .ok_or_else(|| "Clipboard image dimensions do not match the pixel buffer".to_string())?;
    let mut png = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(rgba)
        .write_to(&mut png, ImageFormat::Png)
        .map_err(|error| error.to_string())?;
    Ok(format!(
        "data:image/png;base64,{}",
        BASE64.encode(png.into_inner())
    ))
}

fn data_url_to_image(data_url: &str) -> Result<(Vec<u8>, usize, usize), String> {
    let (_, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid image data URL".to_string())?;
    let bytes = BASE64.decode(encoded).map_err(|error| error.to_string())?;
    let image = image::load_from_memory(&bytes)
        .map_err(|error| error.to_string())?
        .into_rgba8();
    let (width, height) = image.dimensions();
    Ok((image.into_raw(), width as usize, height as usize))
}

fn clipboard_baseline(runtime: &ClipboardRuntime) {
    let Ok(mut clipboard) = Clipboard::new() else {
        return;
    };
    if let Ok(text) = clipboard.get_text() {
        if let Ok(mut last) = runtime.last_text.lock() {
            *last = text;
        }
    }
    if let Ok(image) = clipboard.get_image() {
        if let Ok(mut last) = runtime.last_image_key.lock() {
            *last = image_fingerprint(&image);
        }
    }
}

fn start_clipboard_watcher(app: AppHandle, runtime: &ClipboardRuntime) {
    if runtime.running.swap(true, Ordering::SeqCst) {
        return;
    }
    clipboard_baseline(runtime);
    let token = runtime.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let running = Arc::clone(&runtime.running);
    let generation = Arc::clone(&runtime.generation);
    let suppress_until = Arc::clone(&runtime.suppress_until);
    let last_text = Arc::clone(&runtime.last_text);
    let last_image_key = Arc::clone(&runtime.last_image_key);

    thread::spawn(move || {
        while running.load(Ordering::SeqCst) && generation.load(Ordering::SeqCst) == token {
            if now_millis() >= suppress_until.load(Ordering::SeqCst) {
                if let Ok(mut clipboard) = Clipboard::new() {
                    if let Ok(text) = clipboard.get_text() {
                        let changed = last_text
                            .lock()
                            .map(|mut last| {
                                if text.is_empty() || text.trim().is_empty() || text == *last {
                                    false
                                } else {
                                    *last = text.clone();
                                    true
                                }
                            })
                            .unwrap_or(false);
                        if changed && text.chars().count() <= MAX_TEXT_CHARS {
                            let _ = app.emit(
                                "copyboard:clip.capture",
                                ClipboardCapture {
                                    kind: "text".into(),
                                    content: text,
                                    timestamp: Utc::now().to_rfc3339(),
                                },
                            );
                        }
                    }

                    if let Ok(image) = clipboard.get_image() {
                        let key = image_fingerprint(&image);
                        let changed = last_image_key
                            .lock()
                            .map(|mut last| {
                                if key == *last {
                                    false
                                } else {
                                    *last = key;
                                    true
                                }
                            })
                            .unwrap_or(false);
                        if changed {
                            if let Ok(data_url) = image_to_data_url(&image) {
                                if data_url.len() > 120 && data_url.len() <= MAX_IMAGE_CHARS {
                                    let _ = app.emit(
                                        "copyboard:clip.capture",
                                        ClipboardCapture {
                                            kind: "image".into(),
                                            content: data_url,
                                            timestamp: Utc::now().to_rfc3339(),
                                        },
                                    );
                                }
                            }
                        }
                    }
                }
            }
            thread::sleep(Duration::from_millis(POLL_MS));
        }
    });
}

fn stop_clipboard_watcher(runtime: &ClipboardRuntime) {
    runtime.running.store(false, Ordering::SeqCst);
    runtime.generation.fetch_add(1, Ordering::SeqCst);
}

fn suppress_clipboard(runtime: &ClipboardRuntime, milliseconds: i64) {
    let until = now_millis() + milliseconds.max(0);
    runtime.suppress_until.fetch_max(until, Ordering::SeqCst);
}

fn write_clipboard_text(runtime: &ClipboardRuntime, text: String) -> Result<bool, String> {
    suppress_clipboard(runtime, DEFAULT_SUPPRESS_MS);
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
    clipboard
        .set_text(text.clone())
        .map_err(|error| error.to_string())?;
    if let Ok(mut last) = runtime.last_text.lock() {
        *last = text;
    }
    Ok(true)
}

fn write_clipboard_image(runtime: &ClipboardRuntime, data_url: String) -> Result<bool, String> {
    let (pixels, width, height) = data_url_to_image(&data_url)?;
    suppress_clipboard(runtime, DEFAULT_SUPPRESS_MS);
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
    let image = ImageData {
        width,
        height,
        bytes: Cow::Owned(pixels),
    };
    let key = image_fingerprint(&image);
    clipboard
        .set_image(image)
        .map_err(|error| error.to_string())?;
    if let Ok(mut last) = runtime.last_image_key.lock() {
        *last = key;
    }
    Ok(true)
}

fn emit_forced_capture<R: Runtime>(app: &AppHandle<R>, content: &str, kind: &str) {
    let _ = app.emit(
        "copyboard:clip.capture",
        json!({
            "type": kind,
            "content": content,
            "timestamp": Utc::now().to_rfc3339(),
            "force": true
        }),
    );
}

fn reveal_window<R: Runtime>(app: &AppHandle<R>, focus_search: bool) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    if focus_search {
        let _ = app.emit("copyboard:ui.focusSearch", ());
    }
}

fn reveal_near_cursor<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let (Ok(cursor), Ok(size)) = (app.cursor_position(), window.outer_size()) {
        if let Ok(Some(monitor)) = app.monitor_from_point(cursor.x, cursor.y) {
            let monitor_position = monitor.position();
            let monitor_size = monitor.size();
            let min_x = monitor_position.x as f64;
            let min_y = monitor_position.y as f64;
            let max_x = min_x + monitor_size.width as f64 - size.width as f64;
            let max_y = min_y + monitor_size.height as f64 - size.height as f64;
            let x = (cursor.x - size.width as f64 / 2.0).clamp(min_x, max_x.max(min_x));
            let y = (cursor.y - size.height as f64 / 2.0).clamp(min_y, max_y.max(min_y));
            let _ = window.set_position(Position::Physical(PhysicalPosition::new(
                x.round() as i32,
                y.round() as i32,
            )));
        }
    }
    reveal_window(app, true);
}

fn close_application<R: Runtime>(app: &AppHandle<R>, state: &RuntimeState) {
    state.quitting.store(true, Ordering::SeqCst);
    stop_clipboard_watcher(&state.clipboard);
    let _ = app.emit("copyboard:history.flush", ());
    app.exit(0);
}

fn shorten(value: &str, max: usize) -> String {
    let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut characters = normalized.chars();
    let result = characters
        .by_ref()
        .take(max.saturating_sub(1))
        .collect::<String>();
    if characters.next().is_some() {
        format!("{result}…")
    } else {
        normalized
    }
}

fn favorite_title(item: &Value, language: &str) -> String {
    if let Some(label) = item.get("label").and_then(Value::as_str) {
        if !label.trim().is_empty() {
            return shorten(label, 42);
        }
    }
    let content = item
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if content.starts_with("data:image/") {
        return if language == "en" {
            "Image"
        } else {
            "Изображение"
        }
        .into();
    }
    let first_line = content.lines().next().unwrap_or_default().trim();
    if first_line.is_empty() {
        if language == "en" {
            "Empty favorite"
        } else {
            "Без названия"
        }
        .into()
    } else {
        shorten(first_line, 42)
    }
}

fn rebuild_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let state = app.state::<RuntimeState>();
    let settings = state
        .settings
        .lock()
        .map_err(|error| error.to_string())?
        .clone();
    let language = setting_string(&settings, "language", "ru");
    let favorites = load_json(&favorites_path(&state), json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default();

    let mut menu = MenuBuilder::new(app);
    if favorites.is_empty() {
        let text = if language == "en" {
            "No favorites"
        } else {
            "Нет избранного"
        };
        let empty = MenuItem::with_id(app, "favorites-empty", text, false, None::<&str>)
            .map_err(|error| error.to_string())?;
        menu = menu.item(&empty);
    } else {
        for (index, favorite) in favorites.iter().enumerate() {
            menu = menu.text(
                format!("favorite:{index}"),
                favorite_title(favorite, &language),
            );
        }
    }
    let (open, settings_label, quit, tooltip) = if language == "en" {
        ("Open", "Settings", "Quit", "CopyBoard — Clipboard Manager")
    } else {
        (
            "Открыть",
            "Настройки",
            "Выход",
            "CopyBoard — менеджер буфера",
        )
    };
    let menu = menu
        .separator()
        .text("open", open)
        .text("settings", settings_label)
        .separator()
        .text("quit", quit)
        .build()
        .map_err(|error| error.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))
            .map_err(|error| error.to_string())?;
        tray.set_tooltip(Some(tooltip))
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "Application icon is unavailable".to_string())?;
    TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip(tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "open" => reveal_window(app, false),
                "settings" => {
                    reveal_window(app, false);
                    let _ = app.emit("copyboard:ui.openSettings", ());
                }
                "quit" => {
                    let state = app.state::<RuntimeState>();
                    close_application(app, &state);
                }
                _ if id.starts_with("favorite:") => {
                    let index = id.trim_start_matches("favorite:").parse::<usize>().ok();
                    let state = app.state::<RuntimeState>();
                    let favorites = load_json(&favorites_path(&state), json!([]));
                    let favorite = index.and_then(|index| favorites.as_array()?.get(index));
                    if let Some(content) = favorite
                        .and_then(|item| item.get("content"))
                        .and_then(Value::as_str)
                    {
                        let (copied, kind) = if content.starts_with("data:image/") {
                            (
                                write_clipboard_image(&state.clipboard, content.to_string())
                                    .unwrap_or(false),
                                "image",
                            )
                        } else {
                            (
                                write_clipboard_text(&state.clipboard, content.to_string())
                                    .unwrap_or(false),
                                "text",
                            )
                        };
                        if copied {
                            emit_forced_capture(app, content, kind);
                        }
                    }
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        reveal_window(app, false);
                    }
                }
            }
        })
        .build(app)
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn platform_shortcut(shortcut: &str) -> String {
    #[cfg(target_os = "macos")]
    return shortcut.replace("Ctrl", "Cmd");
    #[cfg(not(target_os = "macos"))]
    shortcut.to_string()
}

fn register_shortcuts<R: Runtime>(app: &AppHandle<R>, settings: &Value) -> bool {
    let manager = app.global_shortcut();
    let _ = manager.unregister_all();
    let reveal = platform_shortcut(&setting_string(
        settings,
        "quickAccessHotkey",
        "Ctrl+Shift+V",
    ));
    let wipe = platform_shortcut(&setting_string(
        settings,
        "clearAllHotkey",
        "Ctrl+Shift+Delete",
    ));
    let reveal_result = manager.on_shortcut(reveal.as_str(), |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            reveal_near_cursor(app);
        }
    });
    let wipe_result = manager.on_shortcut(wipe.as_str(), |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            let _ = app.emit("copyboard:history.wipeShortcut", ());
        }
    });
    reveal_result.is_ok() && wipe_result.is_ok()
}

fn sync_autostart<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> bool {
    if cfg!(debug_assertions) {
        return false;
    }
    let result = if enabled {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    };
    result.is_ok()
}

#[tauri::command]
fn window_ready(window: WebviewWindow, state: State<'_, RuntimeState>) -> bool {
    if state.initial_hidden.swap(false, Ordering::SeqCst) {
        return false;
    }
    let _ = window.show();
    let _ = window.set_focus();
    true
}

#[tauri::command]
fn window_minimize(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_toggle_maximize(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().map_err(|error| error.to_string())? {
        window.unmaximize().map_err(|error| error.to_string())?;
        let _ = window
            .app_handle()
            .emit("copyboard:window.maximized", false);
    } else {
        window.maximize().map_err(|error| error.to_string())?;
        let _ = window.app_handle().emit("copyboard:window.maximized", true);
    }
    Ok(())
}

#[tauri::command]
fn window_close(app: AppHandle, window: WebviewWindow, state: State<'_, RuntimeState>) {
    let close_mode = state
        .settings
        .lock()
        .map(|settings| setting_string(&settings, "closeBehavior", "minimize"))
        .unwrap_or_else(|_| "minimize".into());
    if close_mode == "minimize" {
        let _ = window.hide();
    } else {
        close_application(&app, &state);
    }
}

#[tauri::command]
fn window_is_maximized(window: WebviewWindow) -> Result<bool, String> {
    window.is_maximized().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_show(app: AppHandle) -> bool {
    reveal_window(&app, false);
    true
}

#[tauri::command]
fn window_hide(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|error| error.to_string())
}

fn quick_access_geometry(window: &WebviewWindow) -> Result<(i32, i32, i32, u32, u32), String> {
    let monitor = match window
        .current_monitor()
        .map_err(|error| error.to_string())?
    {
        Some(monitor) => monitor,
        None => window
            .primary_monitor()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Primary monitor is unavailable".to_string())?,
    };
    let scale = monitor.scale_factor();
    let height = (QUICK_ACCESS_HEIGHT * scale).round().max(1.0) as u32;
    let hot_zone = (QUICK_ACCESS_HOT_ZONE * scale).round().max(1.0) as i32;
    let position = monitor.position();
    let size = monitor.size();
    let open_y = position.y;
    let closed_y = open_y - height as i32 + hot_zone;
    Ok((position.x, open_y, closed_y, size.width, height))
}

#[tauri::command]
fn quick_access_ready(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<bool, String> {
    let window = app
        .get_webview_window(QUICK_ACCESS_LABEL)
        .ok_or_else(|| "Quick access window is unavailable".to_string())?;
    state.quick_access_animation.fetch_add(1, Ordering::SeqCst);
    let (x, _open_y, closed_y, width, height) = quick_access_geometry(&window)?;
    window
        .set_size(Size::Physical(PhysicalSize::new(width, height)))
        .map_err(|error| error.to_string())?;
    window
        .set_position(Position::Physical(PhysicalPosition::new(x, closed_y)))
        .map_err(|error| error.to_string())?;
    let _ = window.set_focusable(false);
    let _ = window.set_always_on_top(true);
    window.show().map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
fn quick_access_set_open(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    open: bool,
    reduce_motion: Option<bool>,
) -> Result<bool, String> {
    let window = app
        .get_webview_window(QUICK_ACCESS_LABEL)
        .ok_or_else(|| "Quick access window is unavailable".to_string())?;
    let (x, open_y, closed_y, width, height) = quick_access_geometry(&window)?;
    window
        .set_size(Size::Physical(PhysicalSize::new(width, height)))
        .map_err(|error| error.to_string())?;

    let target_y = if open { open_y } else { closed_y };
    let generation = state
        .quick_access_animation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    let animation = Arc::clone(&state.quick_access_animation);

    if reduce_motion.unwrap_or(false) {
        window
            .set_position(Position::Physical(PhysicalPosition::new(x, target_y)))
            .map_err(|error| error.to_string())?;
        return Ok(true);
    }

    let start_y = window
        .outer_position()
        .map(|position| position.y)
        .unwrap_or(if open { closed_y } else { open_y });
    let steps = if open { 16 } else { 11 };
    let frame_ms = if open { 15 } else { 14 };
    thread::spawn(move || {
        for step in 1..=steps {
            if animation.load(Ordering::SeqCst) != generation {
                return;
            }
            let progress = step as f64 / steps as f64;
            let eased = if open {
                1.0 - (1.0 - progress).powi(3)
            } else {
                progress.powi(3)
            };
            let y = start_y as f64 + (target_y - start_y) as f64 * eased;
            if window
                .set_position(Position::Physical(PhysicalPosition::new(
                    x,
                    y.round() as i32,
                )))
                .is_err()
            {
                return;
            }
            thread::sleep(Duration::from_millis(frame_ms));
        }
    });

    Ok(true)
}

#[tauri::command]
fn clip_start(app: AppHandle, state: State<'_, RuntimeState>) -> bool {
    start_clipboard_watcher(app, &state.clipboard);
    true
}

#[tauri::command]
fn clip_stop(state: State<'_, RuntimeState>) -> bool {
    stop_clipboard_watcher(&state.clipboard);
    true
}

#[tauri::command]
fn clip_read_text() -> String {
    Clipboard::new()
        .and_then(|mut clipboard| clipboard.get_text())
        .unwrap_or_default()
}

#[tauri::command]
fn clip_read_image() -> Option<String> {
    Clipboard::new()
        .and_then(|mut clipboard| clipboard.get_image())
        .ok()
        .and_then(|image| image_to_data_url(&image).ok())
}

#[tauri::command]
fn clip_write_text(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    text: String,
    record_history: Option<bool>,
) -> Result<bool, String> {
    let copied = write_clipboard_text(&state.clipboard, text.clone())?;
    if copied && record_history.unwrap_or(false) {
        emit_forced_capture(&app, &text, "text");
    }
    Ok(copied)
}

#[tauri::command]
fn clip_write_image(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    data_url: String,
    record_history: Option<bool>,
) -> Result<bool, String> {
    let copied = write_clipboard_image(&state.clipboard, data_url.clone())?;
    if copied && record_history.unwrap_or(false) {
        emit_forced_capture(&app, &data_url, "image");
    }
    Ok(copied)
}

#[tauri::command]
fn clip_suppress(state: State<'_, RuntimeState>, ms: Option<i64>) -> bool {
    suppress_clipboard(&state.clipboard, ms.unwrap_or(DEFAULT_SUPPRESS_MS));
    true
}

#[tauri::command]
fn settings_get(state: State<'_, RuntimeState>) -> Result<Value, String> {
    state
        .settings
        .lock()
        .map(|settings| settings.clone())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn settings_save(state: State<'_, RuntimeState>, partial: Value) -> Result<Value, String> {
    let mut settings = state.settings.lock().map_err(|error| error.to_string())?;
    merge_settings(&mut settings, partial);
    save_json(&settings_path(&state), &settings)?;
    Ok(settings.clone())
}

fn save_setting(state: &RuntimeState, key: &str, value: Value) -> Result<(), String> {
    let mut partial = Map::new();
    partial.insert(key.into(), value);
    let mut settings = state.settings.lock().map_err(|error| error.to_string())?;
    merge_settings(&mut settings, Value::Object(partial));
    save_json(&settings_path(state), &settings)
}

#[tauri::command]
fn settings_set_close_mode(state: State<'_, RuntimeState>, mode: String) -> Result<bool, String> {
    save_setting(&state, "closeBehavior", Value::String(mode))?;
    Ok(true)
}

#[tauri::command]
fn settings_get_close_mode(state: State<'_, RuntimeState>) -> String {
    state
        .settings
        .lock()
        .map(|settings| setting_string(&settings, "closeBehavior", "minimize"))
        .unwrap_or_else(|_| "minimize".into())
}

#[tauri::command]
fn settings_set_launch_hidden(
    state: State<'_, RuntimeState>,
    hidden: bool,
) -> Result<bool, String> {
    save_setting(&state, "startMinimized", Value::Bool(hidden))?;
    Ok(true)
}

#[tauri::command]
fn settings_get_launch_hidden(state: State<'_, RuntimeState>) -> bool {
    state
        .settings
        .lock()
        .map(|settings| setting_bool(&settings, "startMinimized", false))
        .unwrap_or(false)
}

#[tauri::command]
fn settings_get_language(state: State<'_, RuntimeState>) -> String {
    state
        .settings
        .lock()
        .map(|settings| setting_string(&settings, "language", "ru"))
        .unwrap_or_else(|_| "ru".into())
}

#[tauri::command]
fn settings_set_language(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    language: String,
) -> Result<bool, String> {
    save_setting(&state, "language", Value::String(language))?;
    rebuild_tray(&app)?;
    Ok(true)
}

#[tauri::command]
fn settings_set_auto_start(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    enabled: bool,
) -> Result<bool, String> {
    if !sync_autostart(&app, enabled) {
        return Ok(false);
    }
    save_setting(&state, "autoStart", Value::Bool(enabled))?;
    Ok(true)
}

#[tauri::command]
fn settings_get_auto_start(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn settings_get_auto_start_status(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> AutoStartSnapshot {
    let open_at_login = app.autolaunch().is_enabled().unwrap_or(false);
    let hidden = state
        .settings
        .lock()
        .map(|settings| setting_bool(&settings, "startMinimized", false))
        .unwrap_or(false);
    AutoStartSnapshot {
        open_at_login,
        open_as_hidden: open_at_login && hidden,
        was_opened_at_login: false,
        was_opened_as_hidden: false,
    }
}

#[tauri::command]
fn settings_set_hotkeys(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    hotkeys: HotkeysInput,
) -> Result<bool, String> {
    let mut partial = Map::new();
    if let Some(shortcut) = hotkeys.quick_access {
        partial.insert("quickAccessHotkey".into(), Value::String(shortcut));
    }
    if let Some(shortcut) = hotkeys.clear_all {
        partial.insert("clearAllHotkey".into(), Value::String(shortcut));
    }
    let settings = settings_save(state, Value::Object(partial))?;
    Ok(register_shortcuts(&app, &settings))
}

#[tauri::command]
fn settings_get_hotkeys(state: State<'_, RuntimeState>) -> HotkeysSnapshot {
    let settings = state.settings.lock().ok();
    HotkeysSnapshot {
        quick_access: settings
            .as_deref()
            .map(|value| setting_string(value, "quickAccessHotkey", "Ctrl+Shift+V"))
            .unwrap_or_else(|| "Ctrl+Shift+V".into()),
        clear_all: settings
            .as_deref()
            .map(|value| setting_string(value, "clearAllHotkey", "Ctrl+Shift+Delete"))
            .unwrap_or_else(|| "Ctrl+Shift+Delete".into()),
    }
}

#[tauri::command]
fn history_load(state: State<'_, RuntimeState>) -> Vec<Value> {
    history_load_inner(&state)
}

#[tauri::command]
fn history_save(state: State<'_, RuntimeState>, items: Vec<Value>) -> Result<bool, String> {
    history_save_inner(&state, &items)?;
    Ok(true)
}

#[tauri::command]
fn history_clear(state: State<'_, RuntimeState>) -> Result<bool, String> {
    let path = history_path(&state);
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    let image_root = images_dir(&state);
    if image_root.is_dir() {
        for entry in fs::read_dir(image_root).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_file() {
                fs::remove_file(path).map_err(|error| error.to_string())?;
            }
        }
    }
    Ok(true)
}

#[tauri::command]
fn history_migrate(
    state: State<'_, RuntimeState>,
    items: Vec<Value>,
) -> Result<Vec<Value>, String> {
    let existing = history_load_inner(&state);
    if !existing.is_empty() || items.is_empty() {
        return Ok(existing);
    }
    history_save_inner(&state, &items)?;
    Ok(items)
}

#[tauri::command]
fn favorites_load(state: State<'_, RuntimeState>) -> Vec<Value> {
    load_json(&favorites_path(&state), json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default()
}

#[tauri::command]
fn favorites_save(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    items: Vec<Value>,
) -> Result<Vec<Value>, String> {
    save_json(&favorites_path(&state), &Value::Array(items.clone()))?;
    rebuild_tray(&app)?;
    let _ = app.emit("copyboard:favorites.changed", items.clone());
    Ok(items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !args.iter().any(|argument| argument == "--hidden") {
                reveal_window(app, false);
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name(APP_NAME)
                .build(),
        )
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            migrate_legacy_data(&data_dir);
            let settings = load_settings_file(&data_dir);
            let launch_hidden = !cfg!(debug_assertions)
                && (std::env::args().any(|argument| argument == "--hidden")
                    || setting_bool(&settings, "startMinimized", false));
            let auto_start = setting_bool(&settings, "autoStart", false);
            let state = RuntimeState {
                data_dir,
                settings: Mutex::new(settings.clone()),
                clipboard: ClipboardRuntime::default(),
                quitting: AtomicBool::new(false),
                initial_hidden: AtomicBool::new(launch_hidden),
                quick_access_animation: Arc::new(AtomicU64::new(0)),
            };
            app.manage(state);
            if !cfg!(debug_assertions) {
                let _ = sync_autostart(app.handle(), auto_start);
            }
            let _ = register_shortcuts(app.handle(), &settings);
            rebuild_tray(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_ready,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_is_maximized,
            window_show,
            window_hide,
            quick_access_ready,
            quick_access_set_open,
            clip_start,
            clip_stop,
            clip_read_text,
            clip_read_image,
            clip_write_text,
            clip_write_image,
            clip_suppress,
            settings_get,
            settings_save,
            settings_set_close_mode,
            settings_get_close_mode,
            settings_set_launch_hidden,
            settings_get_launch_hidden,
            settings_get_language,
            settings_set_language,
            settings_set_auto_start,
            settings_get_auto_start,
            settings_get_auto_start_status,
            settings_set_hotkeys,
            settings_get_hotkeys,
            history_load,
            history_save,
            history_clear,
            history_migrate,
            favorites_load,
            favorites_save
        ])
        .on_window_event(|window, event| {
            if window.label() == QUICK_ACCESS_LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                }
                return;
            }

            match event {
                WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let app = window.app_handle();
                let state = app.state::<RuntimeState>();
                if state.quitting.load(Ordering::SeqCst) {
                    app.exit(0);
                    return;
                }
                let close_mode = state
                    .settings
                    .lock()
                    .map(|settings| setting_string(&settings, "closeBehavior", "minimize"))
                    .unwrap_or_else(|_| "minimize".into());
                if close_mode == "minimize" {
                    let _ = window.hide();
                } else {
                    close_application(app, &state);
                }
                }
                WindowEvent::Resized(_) => {
                if let Ok(maximized) = window.is_maximized() {
                    let _ = window
                        .app_handle()
                        .emit("copyboard:window.maximized", maximized);
                }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building CopyBoard");

    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            if let Some(state) = app.try_state::<RuntimeState>() {
                stop_clipboard_watcher(&state.clipboard);
            }
            let _ = app.global_shortcut().unregister_all();
        }
    });
}
