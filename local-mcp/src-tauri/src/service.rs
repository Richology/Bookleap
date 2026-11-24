use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Write},
    process::{ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
};
use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tokio::sync::oneshot;

type Reply = Result<Value, String>;
#[derive(Default)]
pub struct Service {
    input: Mutex<Option<ChildStdin>>,
    requests: Mutex<HashMap<u64, oneshot::Sender<Reply>>>,
    serial: AtomicU64,
}
impl Service {
    fn send(&self, message: Value) -> Result<(), String> {
        let mut guard = self.input.lock().unwrap();
        let pipe = guard.as_mut().ok_or("助手后台未启动")?;
        writeln!(pipe, "{}", message).map_err(|e| e.to_string())
    }
    pub fn stop(&self) {
        self.input.lock().unwrap().take();
        self.requests.lock().unwrap().clear();
    }
    pub async fn call(&self, action: &str, value: Value) -> Reply {
        let id = self.serial.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.requests.lock().unwrap().insert(id, tx);
        if let Err(e) = self.send(json!({"id":id,"action":action,"value":value})) {
            self.requests.lock().unwrap().remove(&id);
            return Err(e);
        }
        rx.await.map_err(|_| "助手后台已退出".to_string())?
    }
    pub fn launch(self: &Arc<Self>, app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let runtime = app.path().resource_dir()?.join("runtime");
        let mut data = app.path().data_dir()?.join("bookleap-local-mcp");
        let mut docs = app.path().document_dir()?;
        let testing = std::env::args().any(|arg| arg == "--bookleap-test");
        if testing {
            docs = dunce::canonicalize(std::env::var("BOOKLEAP_TEST_HOME")?)?;
            data = docs.join("app");
        }
        let mut cmd = Command::new(runtime.join(if cfg!(windows) { "node.exe" } else { "node" }));
        if testing {
            let log = std::fs::File::create(docs.join("service-startup.log"))?;
            cmd.stderr(Stdio::from(log));
        } else {
            cmd.env_remove("BOOKLEAP_TEST_HOME");
            cmd.stderr(Stdio::null());
        }
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        let mut child = cmd
            .arg(runtime.join("src/webview-service.mjs"))
            .arg(data)
            .arg(docs)
            .arg(runtime.join("src/mcp.mjs"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()?;
        let mut reader = BufReader::new(child.stdout.take().unwrap());
        let mut first = String::new();
        reader.read_line(&mut first)?;
        if serde_json::from_str::<Value>(&first)
            .ok()
            .and_then(|v| v["ready"].as_bool())
            != Some(true)
        {
            let _ = child.kill();
            let _ = child.wait();
            return Err("无法启动同步服务。请退出旧助手，并检查书库权限和接收端口。".into());
        }
        *self.input.lock().unwrap() = child.stdin.take();
        let service = self.clone();
        thread::spawn(move || {
            for line in reader.lines().map_while(Result::ok) {
                let Ok(msg) = serde_json::from_str::<Value>(&line) else {
                    break;
                };
                let Some(id) = msg["id"].as_u64() else {
                    continue;
                };
                if msg["native"].is_string() {
                    let app = app.clone();
                    let service = service.clone();
                    thread::spawn(move || {
                        let result = native(&app, &msg);
                        let response = match result {
                            Ok(value) => json!({"reply":id,"value":value}),
                            Err(e) => json!({"reply":id,"error":e}),
                        };
                        let _ = service.send(response);
                    });
                } else if let Some(tx) = service.requests.lock().unwrap().remove(&id) {
                    let result = match msg["error"].as_str() {
                        Some(e) => Err(e.to_string()),
                        None => Ok(msg["value"].clone()),
                    };
                    let _ = tx.send(result);
                }
            }
            service.stop();
            let _ = child.wait();
        });
        Ok(())
    }
}
fn native(app: &AppHandle, msg: &Value) -> Reply {
    match msg["native"].as_str() {
        Some(method @ ("confirm" | "confirm-source")) => {
            super::show(app);
            let ok = app
                .dialog()
                .message(msg["value"].as_str().ok_or("invalid")?)
                .title("书跃本地同步助手")
                .buttons(MessageDialogButtons::OkCancelCustom(
                    if method == "confirm-source" {
                        "允许此来源"
                    } else {
                        "确认"
                    }
                    .into(),
                    "取消".into(),
                ))
                .blocking_show();
            Ok(json!(ok))
        }
        Some("folder") => Ok(json!(app
            .dialog()
            .file()
            .blocking_pick_folder()
            .and_then(|f| f.into_path().ok()))),
        Some("autostart") => {
            let manager = app.autolaunch();
            if msg["value"].as_bool().ok_or("invalid")? {
                manager.enable()
            } else {
                manager.disable()
            }
            .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        Some("quit") => {
            app.exit(0);
            Ok(Value::Null)
        }
        _ => Err("unknown native request".into()),
    }
}
