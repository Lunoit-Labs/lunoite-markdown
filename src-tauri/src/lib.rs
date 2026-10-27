use std::path::Path;
use tauri::{Emitter, Manager};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct NativeFileNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub native_path: String,
    pub kind: String,
    pub extension: Option<String>,
    pub children: Option<Vec<NativeFileNode>>,
}

#[tauri::command]
fn get_cli_files() -> Vec<String> {
    let args: Vec<String> = std::env::args().collect();
    let mut files = Vec::new();
    for arg in args.into_iter().skip(1) {
        if !arg.starts_with("--") {
            let p = Path::new(&arg);
            if p.exists() && p.is_file() {
                files.push(arg);
            }
        }
    }
    files
}

#[tauri::command]
fn get_cli_file() -> Option<String> {
    get_cli_files().into_iter().next()
}

#[tauri::command]
fn pick_native_directory() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Select Workspace Folder")
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn pick_native_file() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Open Markdown File")
        .add_filter("Markdown Files", &["md", "markdown", "txt"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn read_native_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_native_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_native_directory(root_path: String) -> Result<Vec<NativeFileNode>, String> {
    fn scan_dir(dir: &Path, base_rel: &str) -> Result<Vec<NativeFileNode>, String> {
        let mut entries = Vec::new();
        let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

        for entry_res in read_dir {
            let entry = entry_res.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden or build folders
            if (name.starts_with('.') && name != ".lunoite")
                || name == "node_modules"
                || name == "dist"
            {
                continue;
            }

            let full_path = entry.path();
            let rel_path = if base_rel.is_empty() {
                name.clone()
            } else {
                format!("{}/{}", base_rel, name)
            };

            let is_dir = full_path.is_dir();
            if is_dir {
                let children = scan_dir(&full_path, &rel_path)?;
                entries.push(NativeFileNode {
                    id: rel_path.clone(),
                    name,
                    path: rel_path,
                    native_path: full_path.to_string_lossy().to_string(),
                    kind: "directory".to_string(),
                    extension: None,
                    children: Some(children),
                });
            } else {
                let ext = full_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase());
                entries.push(NativeFileNode {
                    id: rel_path.clone(),
                    name,
                    path: rel_path,
                    native_path: full_path.to_string_lossy().to_string(),
                    kind: "file".to_string(),
                    extension: ext,
                    children: None,
                });
            }
        }

        // Sort: directories first, then alphabetical
        entries.sort_by(|a, b| {
            if a.kind == b.kind {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            } else if a.kind == "directory" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(entries)
    }

    let root = Path::new(&root_path);
    if !root.exists() || !root.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    scan_dir(root, "")
}

#[tauri::command]
fn create_native_file(dir_path: String, name: String) -> Result<String, String> {
    let mut file_path = Path::new(&dir_path).join(&name);
    if file_path.extension().is_none() {
        file_path = file_path.with_extension("md");
    }
    if !file_path.exists() {
        std::fs::write(&file_path, "# Untitled\n\nStart writing...\n")
            .map_err(|e| e.to_string())?;
    }
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_native_dir(dir_path: String, name: String) -> Result<String, String> {
    let folder_path = Path::new(&dir_path).join(&name);
    std::fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;
    Ok(folder_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_native_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_native_entry(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let base_cwd = Path::new(&cwd);
            let mut files_to_open: Vec<String> = Vec::new();

            for arg in args.into_iter().skip(1) {
                if !arg.starts_with("--") {
                    let p = Path::new(&arg);
                    let resolved = if p.is_absolute() {
                        p.to_path_buf()
                    } else {
                        base_cwd.join(p)
                    };
                    if resolved.exists() && resolved.is_file() {
                        files_to_open.push(resolved.to_string_lossy().to_string());
                    }
                }
            }

            if let Some(window) = app
                .get_webview_window("main")
                .or_else(|| app.webview_windows().values().next().cloned())
            {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }

            for file in files_to_open {
                let _ = app.emit("open-native-file", file);
            }
        }))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_cli_file,
            get_cli_files,
            pick_native_directory,
            pick_native_file,
            read_native_file,
            write_native_file,
            scan_native_directory,
            create_native_file,
            create_native_dir,
            delete_native_entry,
            rename_native_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
