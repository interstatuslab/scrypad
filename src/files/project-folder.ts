/**
 * Project Folder Manager
 * Scans directories, maps relative paths, resolves preview assets, and handles multi-file projects.
 */

export interface ProjectFileEntry {
  path: string; // e.g. "note.html", "css/base.css", "img/kenney/cat.png"
  name: string;
  kind: 'html' | 'css' | 'js' | 'image' | 'font' | 'other';
  handle?: FileSystemFileHandle;
  file?: File;
  inMemoryContent?: string;
}

export class ProjectFolder {
  public name: string = '';
  public files: Map<string, ProjectFileEntry> = new Map();
  private blobUrlMap: Map<string, string> = new Map();
  private dirHandle: FileSystemDirectoryHandle | null = null;

  constructor(name: string, dirHandle?: FileSystemDirectoryHandle) {
    this.name = name;
    this.dirHandle = dirHandle || null;
  }

  public getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.dirHandle;
  }

  /**
   * Load project from File System Directory Handle
   */
  public static async fromDirectoryHandle(dirHandle: FileSystemDirectoryHandle): Promise<ProjectFolder> {
    const project = new ProjectFolder(dirHandle.name, dirHandle);
    await project.scanDirectory(dirHandle, '');
    return project;
  }

  /**
   * Load project from FileList (e.g. <input type="file" webkitdirectory>)
   */
  public static async fromFileList(fileList: FileList): Promise<ProjectFolder> {
    const rootName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'project';
    const project = new ProjectFolder(rootName);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Strip root folder name from relative path
      const parts = file.webkitRelativePath.split('/');
      parts.shift();
      const relativePath = parts.join('/');
      if (!relativePath) continue;

      project.files.set(relativePath, {
        path: relativePath,
        name: file.name,
        kind: project.determineKind(file.name),
        file
      });
    }

    return project;
  }

  private async scanDirectory(dir: FileSystemDirectoryHandle, currentPath: string) {
    for await (const entry of dir.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        this.files.set(entryPath, {
          path: entryPath,
          name: entry.name,
          kind: this.determineKind(entry.name),
          handle: fileHandle,
          file
        });
      } else if (entry.kind === 'directory') {
        // Skip hidden or build directories
        if (!['.git', 'node_modules', 'dist', 'target', '.system_generated'].includes(entry.name)) {
          await this.scanDirectory(entry as FileSystemDirectoryHandle, entryPath);
        }
      }
    }
  }

  private determineKind(filename: string): ProjectFileEntry['kind'] {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
    if (lower.endsWith('.css')) return 'css';
    if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.ts')) return 'js';
    if (/\.(png|jpe?g|svg|webp|gif|ico)$/.test(lower)) return 'image';
    if (/\.(woff2?|ttf|otf|eot)$/.test(lower)) return 'font';
    return 'other';
  }

  public getHtmlFiles(): ProjectFileEntry[] {
    return Array.from(this.files.values()).filter(f => f.kind === 'html');
  }

  public getFilesList(): ProjectFileEntry[] {
    return Array.from(this.files.values()).sort((a, b) => {
      // HTML first, then CSS, then JS, then others
      const order = { html: 0, css: 1, js: 2, image: 3, font: 4, other: 5 };
      if (order[a.kind] !== order[b.kind]) {
        return order[a.kind] - order[b.kind];
      }
      return a.path.localeCompare(b.path);
    });
  }

  public async readFile(relativePath: string): Promise<string | null> {
    const entry = this.files.get(relativePath);
    if (!entry) return null;

    if (entry.inMemoryContent !== undefined) {
      return entry.inMemoryContent;
    }
    if (entry.handle) {
      const file = await entry.handle.getFile();
      return await file.text();
    } else if (entry.file) {
      return await entry.file.text();
    }
    return null;
  }

  public updateInMemoryContent(relativePath: string, content: string) {
    const entry = this.files.get(relativePath);
    if (entry) {
      entry.inMemoryContent = content;
    }
  }

  public async saveFile(relativePath: string, content: string): Promise<boolean> {
    const entry = this.files.get(relativePath);
    if (!entry) return false;

    entry.inMemoryContent = content;
    if (entry.handle) {
      try {
        const writable = await entry.handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch (err) {
        console.error(`Failed to save ${relativePath}:`, err);
        return false;
      }
    } else if (entry.file) {
      return true;
    }
    return false;
  }

  /**
   * Resolves relative CSS, scripts, and image references in HTML by inlining or creating object URLs
   * so the preview renders identically to the actual desktop app!
   */
  public async resolvePreviewAssets(html: string, currentHtmlPath: string = ''): Promise<string> {
    let resolved = html;
    const baseDir = currentHtmlPath.includes('/') ? currentHtmlPath.substring(0, currentHtmlPath.lastIndexOf('/')) : '';

    // 1. Resolve relative CSS stylesheets by inlining the actual local CSS content
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/|\/\/|data:)([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    const matchesToReplace: Array<{ original: string; inlinedStyle: string }> = [];

    while ((match = linkRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const relHref = match[1];

      // Normalize path relative to the current HTML file
      const normalizedPath = this.normalizePath(baseDir, relHref);
      let cssContent = await this.readFile(normalizedPath);

      // If not found by exact path, try matching by filename across the project
      if (cssContent === null) {
        const basename = relHref.split('/').pop() || relHref;
        for (const [p, f] of this.files) {
          if (f.name === basename && f.kind === 'css') {
            cssContent = await this.readFile(p);
            break;
          }
        }
      }

      if (cssContent !== null) {
        matchesToReplace.push({
          original: fullTag,
          inlinedStyle: `<style data-source="${normalizedPath}" data-scrypad-href="${relHref.replace(/"/g, '&quot;')}">\n/* --- Resolved from ${normalizedPath} --- */\n${cssContent}\n</style>`
        });
      }
    }

    for (const item of matchesToReplace) {
      resolved = resolved.replace(item.original, item.inlinedStyle);
    }

    // 2. Resolve relative image sources (<img src="...") via object URLs or data URIs
    const imgRegex = /<img[^>]+src=["'](?!https?:\/\/|\/\/|data:|blob:)([^"']+)["'][^>]*>/gi;
    while ((match = imgRegex.exec(resolved)) !== null) {
      const originalSrc = match[1];
      const normalizedPath = this.normalizePath(baseDir, originalSrc);
      const entry = this.files.get(normalizedPath);

      if (entry && entry.file) {
        let blobUrl = this.blobUrlMap.get(normalizedPath);
        if (!blobUrl) {
          blobUrl = URL.createObjectURL(entry.file);
          this.blobUrlMap.set(normalizedPath, blobUrl);
        }
        const escaped = originalSrc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        // data-scrypad-src remembers the real path, so edits made in the preview keep it
        resolved = resolved.replace(new RegExp(`(src=["'])${escaped}(["'])`, 'g'), `$1${blobUrl}$2 data-scrypad-src="${originalSrc.replace(/"/g, '&quot;')}"`);
      }
    }

    return resolved;
  }

  private normalizePath(baseDir: string, relativePath: string): string {
    // Remove leading ./ if any
    let cleaned = relativePath.replace(/^\.\//, '');
    if (!baseDir) return cleaned;

    const parts = baseDir.split('/').filter(Boolean);
    const relParts = cleaned.split('/');

    for (const part of relParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }
    return parts.join('/');
  }

  /** The raw bytes of a project file (for exports). */
  public async readBytes(relativePath: string): Promise<Uint8Array | null> {
    const entry = this.files.get(relativePath);
    if (!entry) return null;
    if (entry.inMemoryContent !== undefined) return new TextEncoder().encode(entry.inMemoryContent);
    const f = entry.handle ? await entry.handle.getFile() : entry.file;
    return f ? new Uint8Array(await f.arrayBuffer()) : null;
  }

  /** Turns a path written in a page (like ../img/cat.png) into a project path. */
  public resolvePath(fromHtmlPath: string, ref: string): string {
    const baseDir = fromHtmlPath.includes('/') ? fromHtmlPath.substring(0, fromHtmlPath.lastIndexOf('/')) : '';
    return this.normalizePath(baseDir, ref.split(/[?#]/)[0]);
  }

  public dispose() {
    this.blobUrlMap.forEach(url => URL.revokeObjectURL(url));
    this.blobUrlMap.clear();
  }
}
