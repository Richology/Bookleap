#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod service;
use serde_json::Value;
use service::Service;
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;

fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
#[tauri::command]
async fn bookleap(
    service: State<'_, Arc<Service>>,
    action: String,
    value: Value,
) -> Result<Value, String> {
    service.call(&action, value).await
}
#[tauri::command]
fn take_citation(pending: State<'_, Mutex<Option<String>>>) -> Option<String> {
    pending.lock().unwrap().take()
}
fn receive(app: &AppHandle, url: &tauri::Url) {
    if url.scheme() == "bookleap-local" && url.host_str() == Some("citation") {
        let Ok(id) =
            percent_encoding::percent_decode_str(url.path().trim_start_matches('/')).decode_utf8()
        else {
            return;
        };
        if id.is_empty() || id.len() > 250 {
            return;
        }
        *app.state::<Mutex<Option<String>>>().lock().unwrap() = Some(id.into_owned());
        show(app);
        let _ = app.emit("citation", ());
    }
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .manage(Mutex::new(None::<String>))
        .manage(Arc::new(Service::default()))
        .invoke_handler(tauri::generate_handler![bookleap, take_citation])
        .setup(|app| {
            let handle = app.handle().clone();
            if let Err(e) = app.state::<Arc<Service>>().launch(handle.clone()) {
                let message = format!("书跃助手未启动。{e}");
                app.dialog().message(message).show(move |_| handle.exit(1));
                return Ok(());
            }
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    receive(&handle, &url);
                }
            });
            if let Some(urls) = app.deep_link().get_current()? {
                for url in urls {
                    receive(app.handle(), &url);
                }
            }
            let open = MenuItem::with_id(app, "open", "打开书跃本地同步助手", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "暂停 / 恢复接收", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出助手", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &pause, &quit])?;
            TrayIconBuilder::new()
                .menu(&menu)
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../../ui/trayTemplate.png"
                ))?)
                .icon_as_template(true)
                .tooltip("书跃本地同步助手")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show(app),
                    "quit" => app.exit(0),
                    "pause" => {
                        let service = app.state::<Arc<Service>>().inner().clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = service.call("pause", Value::Null).await;
                        });
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("无法初始化书跃助手")
        .run(|app, event| match event {
            tauri::RunEvent::Exit => app.state::<Arc<Service>>().stop(),
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => show(app),
            _ => {}
        });
}
