import { ProjectFolder } from './project-folder.ts';
import { isDesktop, desktopOpen, desktopWrite, desktopSaveAs, desktopReadPath, DesktopFile } from './desktop.ts';
import type { RecentFile } from './recent-files.ts';


/** The browser's file pickers only work when ScryPad is the whole page. Inside another
 *  site's frame (like itch.io) they throw, so ScryPad uses the plain upload / download way. */
function canUseFilePicker(name: string): boolean {
  let topLevel = true;
  try { topLevel = window.self === window.top; } catch { topLevel = false; }
  return name in window && topLevel;
}

export interface FileState {
  handle: FileSystemFileHandle | null;
  name: string;
  isDirty: boolean;
  projectPath: string | null;
  projectName: string | null;
  /** Full path on disk (desktop app only). */
  diskPath?: string | null;
}

export class FileManager {
  private state: FileState = {
    handle: null,
    name: 'untitled.html',
    isDirty: false,
    projectPath: null,
    projectName: null
  };

  private currentProject: ProjectFolder | null = null;
  private onStateChangeCallbacks: Array<(state: FileState) => void> = [];
  private onProjectChangeCallbacks: Array<(project: ProjectFolder | null) => void> = [];

  // Memory buffer cache for active files so switching files does not lose edits or embedded CSS
  private fileBufferCache: Map<string, string> = new Map();
  // Persistent embedded CSS cache: maps filename & relative hrefs to CSS strings
  private embeddedCssCache: Map<string, string> = new Map();

  constructor() {
    this.loadCachedCss();
  }

  private loadCachedCss() {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('scrypad_css_cache_')) {
          const name = k.replace('scrypad_css_cache_', '');
          const val = localStorage.getItem(k);
          if (val) {
            this.embeddedCssCache.set(name, val);
          }
        }
      }
    } catch {
      // localStorage unavailable or restricted
    }
  }

  public registerCss(name: string, content: string, href?: string) {
    const basename = name.split('/').pop() || name;
    this.embeddedCssCache.set(basename, content);
    if (href) {
      this.embeddedCssCache.set(href, content);
    }
    try {
      localStorage.setItem(`scrypad_css_cache_${basename}`, content);
      if (href) {
        localStorage.setItem(`scrypad_css_cache_${href}`, content);
      }
    } catch {
      // ignore storage quota error
    }

    // Also register into active project folder if loaded
    if (this.currentProject) {
      this.currentProject.files.set(basename, {
        path: basename,
        name: basename,
        kind: 'css',
        inMemoryContent: content
      });
      if (href && href !== basename) {
        this.currentProject.files.set(href, {
          path: href,
          name: basename,
          kind: 'css',
          inMemoryContent: content
        });
      }
    }
  }

  public getCachedCss(href: string): string | null {
    const basename = href.split('/').pop() || href;
    return this.embeddedCssCache.get(href) || this.embeddedCssCache.get(basename) || null;
  }

  public hasCss(href: string): boolean {
    const basename = href.split('/').pop() || href;
    if (this.embeddedCssCache.has(href) || this.embeddedCssCache.has(basename)) {
      return true;
    }
    if (this.currentProject) {
      if (this.currentProject.files.has(href)) return true;
      for (const [, f] of this.currentProject.files) {
        if (f.name === basename && f.kind === 'css') return true;
      }
    }
    return false;
  }

  public bufferCurrentFile(content: string) {
    if (this.state.projectPath) {
      this.fileBufferCache.set(this.state.projectPath, content);
      this.currentProject?.updateInMemoryContent(this.state.projectPath, content);
    } else if (this.state.name) {
      this.fileBufferCache.set(this.state.name, content);
    }
  }

  public subscribe(cb: (state: FileState) => void) {
    this.onStateChangeCallbacks.push(cb);
    cb(this.state);
  }

  public subscribeProject(cb: (project: ProjectFolder | null) => void) {
    this.onProjectChangeCallbacks.push(cb);
    cb(this.currentProject);
  }

  private notify() {
    this.onStateChangeCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private notifyProject() {
    this.onProjectChangeCallbacks.forEach(cb => cb(this.currentProject));
  }

  public markDirty(dirty: boolean = true) {
    if (this.state.isDirty !== dirty) {
      this.state.isDirty = dirty;
      this.notify();
    }
  }

  public getFilename(): string {
    return this.state.name;
  }

  public setFilename(name: string) {
    this.state.name = name;
    this.notify();
  }

  public isDirty(): boolean {
    return this.state.isDirty;
  }

  public getState(): FileState {
    return { ...this.state };
  }

  public getProjectPath(): string | null {
    return this.state.projectPath;
  }

  public getProject(): ProjectFolder | null {
    return this.currentProject;
  }

  public setUntitled() {
    this.state = {
      handle: null,
      name: 'untitled.html',
      isDirty: false,
      projectPath: null,
      projectName: this.currentProject ? this.currentProject.name : null
    };
    this.notify();
  }

  /**
   * Open directory / folder
   */
  public async openDirectory(): Promise<ProjectFolder | null> {
    if (canUseFilePicker('showDirectoryPicker')) {
      try {
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        const project = await ProjectFolder.fromDirectoryHandle(dirHandle);
        this.currentProject?.dispose();
        this.currentProject = project;
        this.notifyProject();
        return project;
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Error opening directory:', err);
        }
        return null;
      }
    }
    return null;
  }

  public setProjectFromFiles(fileList: FileList): ProjectFolder | null {
    if (!fileList || fileList.length === 0) return null;
    ProjectFolder.fromFileList(fileList).then(project => {
      this.currentProject?.dispose();
      this.currentProject = project;
      this.notifyProject();
    });
    return null;
  }

  /**
   * Switch active file inside current project
   */
  public async openProjectFile(relativePath: string, currentContentToBuffer?: string): Promise<string | null> {
    if (!this.currentProject) return null;

    // Buffer the file we are currently navigating away from
    if (this.state.projectPath && currentContentToBuffer !== undefined) {
      this.fileBufferCache.set(this.state.projectPath, currentContentToBuffer);
      this.currentProject.updateInMemoryContent(this.state.projectPath, currentContentToBuffer);
    }

    // Check if the target file has in-memory buffered content
    let content: string | null = null;
    if (this.fileBufferCache.has(relativePath)) {
      content = this.fileBufferCache.get(relativePath)!;
    } else {
      content = await this.currentProject.readFile(relativePath);
      if (content !== null) {
        this.fileBufferCache.set(relativePath, content);
      }
    }

    if (content !== null) {
      const entry = this.currentProject.files.get(relativePath);
      this.state = {
        handle: entry?.handle || null,
        name: entry?.name || relativePath,
        isDirty: false,
        projectPath: relativePath,
        projectName: this.currentProject.name
      };
      this.notify();
      return content;
    }
    return null;
  }

  /**
   * Open single file using File System Access API or fallback
   */
  public async openFile(): Promise<string | null> {
    if (isDesktop()) {
      try {
        const f = await desktopOpen();
        if (!f) return null;
        return this.adoptDesktopFile(f);
      } catch (err) {
        console.error('Desktop open failed:', err);
        return null;
      }
    }
    if (canUseFilePicker('showOpenFilePicker')) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'HTML Files',
              accept: { 'text/html': ['.html', '.htm'] }
            }
          ],
          multiple: false
        });
        const file = await handle.getFile();
        const content = await file.text();
        this.state = {
          handle,
          name: file.name,
          isDirty: false,
          projectPath: null,
          projectName: this.currentProject ? this.currentProject.name : null
        };
        this.notify();
        return content;
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Error opening file via File System Access:', err);
        }
        return null;
      }
    } else {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.htm';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const content = await file.text();
          this.state = {
            handle: null,
            name: file.name,
            isDirty: false,
            projectPath: null,
            projectName: this.currentProject ? this.currentProject.name : null
          };
          this.notify();
          resolve(content);
        };
        input.click();
      });
    }
  }

  /**
   * Save file using project handle, existing handle or prompt Save As
   */
  /** What File › Recent needs to reopen the current file later. */
  public recentInfo(): { name: string; path?: string | null; handle?: FileSystemFileHandle | null } {
    return { name: this.state.name, path: this.state.diskPath ?? null, handle: this.state.handle ?? null };
  }

  /** Reopen a file from File › Recent. Throws if the file is gone or permission is refused. */
  public async openRecent(rec: RecentFile): Promise<string> {
    if (rec.path && isDesktop()) {
      return this.adoptDesktopFile(await desktopReadPath(rec.path));
    }
    const handle = rec.handle;
    if (!handle) throw new Error('missing');
    if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('permission');
    }
    const file = await handle.getFile();
    const content = await file.text();
    this.state = {
      handle,
      name: file.name,
      isDirty: false,
      projectPath: null,
      projectName: this.currentProject ? this.currentProject.name : null
    };
    this.notify();
    return content;
  }

  /** Use a file the desktop app read from disk (Open dialog or double-click). */
  public adoptDesktopFile(f: DesktopFile): string {
    this.state = {
      handle: null,
      name: f.name,
      isDirty: false,
      projectPath: null,
      projectName: this.currentProject ? this.currentProject.name : null,
      diskPath: f.path
    };
    this.notify();
    return f.content;
  }

  public async saveFile(content: string, forceSaveAs: boolean = false): Promise<boolean> {
    // Keep in-memory buffer up to date
    if (this.state.projectPath) {
      this.fileBufferCache.set(this.state.projectPath, content);
      this.currentProject?.updateInMemoryContent(this.state.projectPath, content);
    } else if (this.state.name) {
      this.fileBufferCache.set(this.state.name, content);
    }

    // If currently editing a project file, write directly to project
    if (this.currentProject && this.state.projectPath && !forceSaveAs) {
      const ok = await this.currentProject.saveFile(this.state.projectPath, content);
      if (ok) {
        this.markDirty(false);
        return true;
      }
    }

    if (isDesktop()) {
      try {
        if (this.state.diskPath && !forceSaveAs) {
          await desktopWrite(this.state.diskPath, content);
          this.markDirty(false);
          return true;
        }
        const saved = await desktopSaveAs(this.state.name || 'index.html', content);
        if (!saved) return false;
        this.state = { ...this.state, handle: null, name: saved.name, isDirty: false, diskPath: saved.path };
        this.notify();
        return true;
      } catch (err) {
        console.error('Desktop save failed:', err);
        return false;
      }
    }

    if (canUseFilePicker('showSaveFilePicker')) {
      try {
        let handle = this.state.handle;
        if (!handle || forceSaveAs) {
          handle = await window.showSaveFilePicker({
            suggestedName: this.state.name || 'index.html',
            types: [
              {
                description: 'HTML File',
                accept: { 'text/html': ['.html'] }
              }
            ]
          });
        }
        if (!handle) return false;

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        this.state = {
          handle,
          name: handle.name,
          isDirty: false,
          projectPath: this.state.projectPath,
          projectName: this.state.projectName
        };
        this.notify();
        return true;
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Save failed via File System Access:', err);
        }
        return false;
      }
    } else {
      // Fallback: Download blob
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.state.name || 'index.html';
      a.click();
      URL.revokeObjectURL(url);
      this.markDirty(false);
      return true;
    }
  }

  public async resolvePreview(html: string): Promise<string> {
    let resolved = html;
    if (this.currentProject) {
      resolved = await this.currentProject.resolvePreviewAssets(html, this.state.projectPath || '');
    }

    // Resolve any remaining relative stylesheets from persistent embeddedCssCache
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/|\/\/|data:)([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    const toReplace: Array<{ original: string; inlined: string }> = [];

    while ((match = linkRegex.exec(resolved)) !== null) {
      const fullTag = match[0];
      const relHref = match[1];
      const cachedCss = this.getCachedCss(relHref);
      if (cachedCss) {
        toReplace.push({
          original: fullTag,
          inlined: `<style data-source="${relHref}" data-scrypad-href="${relHref.replace(/"/g, '&quot;')}">\n/* --- Cached Stylesheet (${relHref}) --- */\n${cachedCss}\n</style>`
        });
      }
    }

    for (const item of toReplace) {
      resolved = resolved.replace(item.original, item.inlined);
    }

    return resolved;
  }
}
