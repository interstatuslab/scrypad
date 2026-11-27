// TypeScript's DOM types don't include the File System Access pickers, handle
// permissions, or the Tauri desktop globals yet, so they're declared here.

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface TauriWindow {
  onCloseRequested(handler: (event: { preventDefault: () => void }) => void | Promise<void>): Promise<() => void>;
  destroy(): Promise<void>;
}

interface TauriGlobal {
  core?: { invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> };
  window?: { getCurrentWindow?(): TauriWindow };
}

interface Window {
  showOpenFilePicker(options?: { types?: FilePickerAcceptType[]; multiple?: boolean }): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: { suggestedName?: string; types?: FilePickerAcceptType[] }): Promise<FileSystemFileHandle>;
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  __TAURI__?: TauriGlobal;
  __TAURI_INTERNALS__?: unknown;
}
