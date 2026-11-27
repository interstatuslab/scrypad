// Exports for the indie web: a Site Zip (Neocities, Nekoweb, any host) and One HTML File
// (stylesheets, scripts and pictures tucked inside, so the page works on its own).
import type { FileManager } from '../files/file-manager.ts';
import type { ProjectFolder } from '../files/project-folder.ts';
import { isDesktop } from '../files/desktop.ts';

export interface ZipEntry { path: string; data: Uint8Array }

// ---------- Zip (stored, no compression: simple, and every host can open it) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function makeZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = enc.encode(e.path);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // names are UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, e.data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// ---------- Gathering the site ----------
const SKIP = /(^|\/)(\.git|\.github|node_modules|\.vscode|\.idea|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i;

export interface SiteFiles {
  entries: ZipEntry[];
  /** Name for the download, like "my-site" */
  name: string;
  hasIndex: boolean;
  /** The page being edited, as a path in the site */
  mainPath: string;
}

function baseName(file: string): string {
  return (file.replace(/\.[^.]+$/, '') || 'my-site').replace(/[^\w.-]+/g, '-');
}

export async function collectSite(fm: FileManager, currentCode: string): Promise<SiteFiles> {
  const enc = new TextEncoder();
  const project = fm.getProject();
  const mainPath = fm.getProjectPath();
  if (project && mainPath) {
    const entries: ZipEntry[] = [];
    for (const path of Array.from(project.files.keys()).sort()) {
      if (SKIP.test(path)) continue;
      const data = path === mainPath ? enc.encode(currentCode) : await project.readBytes(path);
      if (data) entries.push({ path, data });
    }
    return { entries, name: baseName(project.name), hasIndex: project.files.has('index.html'), mainPath };
  }
  // A single page: it becomes the site's front page
  return { entries: [{ path: 'index.html', data: enc.encode(currentCode) }], name: baseName(fm.getFilename()), hasIndex: true, mainPath: 'index.html' };
}

// ---------- One HTML File ----------
const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  ico: 'image/x-icon', avif: 'image/avif', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm',
};

const isLocal = (ref: string) => !!ref && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref);

function toDataUrl(path: string, bytes: Uint8Array): string {
  const ext = (path.split('.').pop() || '').toLowerCase();
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${btoa(bin)}`;
}

async function replaceAsync(text: string, re: RegExp, fn: (...m: string[]) => Promise<string>): Promise<string> {
  const jobs: Promise<string>[] = [];
  text.replace(re, (...m: any[]) => { jobs.push(fn(...m)); return m[0]; });
  const done = await Promise.all(jobs);
  let i = 0;
  return text.replace(re, () => done[i++]);
}

/** Tuck url(...) files (fonts, backgrounds) inside CSS. `from` is the file the CSS lives in. */
async function inlineCssUrls(css: string, project: ProjectFolder, from: string, missing: Set<string>): Promise<string> {
  return replaceAsync(css, /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, async (all, _q, ref) => {
    if (!isLocal(ref)) return all;
    const p = project.resolvePath(from, ref);
    const bytes = await project.readBytes(p);
    if (!bytes) { missing.add(ref); return all; }
    return `url("${toDataUrl(p, bytes)}")`;
  });
}

export interface OneFileResult { html: string; missing: string[] }

export async function bundleOneFile(fm: FileManager, html: string): Promise<OneFileResult> {
  const project = fm.getProject();
  const from = fm.getProjectPath() || '';
  const missing = new Set<string>();
  if (!project) {
    // A single page: tuck in any stylesheets ScryPad was given earlier
    let out = html;
    out = out.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1] || '';
      const css = isLocal(href) ? fm.getCachedCss(href) : null;
      if (isLocal(href) && !css) missing.add(href);
      return css ? `<style>\n${css}\n</style>` : tag;
    });
    out.replace(/<(?:img|script)\b[^>]*\ssrc=["']([^"']+)["']/gi, (m, ref) => { if (isLocal(ref)) missing.add(ref); return m; });
    return { html: out, missing: Array.from(missing) };
  }

  let out = html;
  // Stylesheets
  out = await replaceAsync(out, /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, async (tag) => {
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1] || '';
    if (!isLocal(href)) return tag;
    const p = project.resolvePath(from, href);
    const css = await project.readFile(p);
    if (css === null) { missing.add(href); return tag; }
    return `<style>\n${await inlineCssUrls(css, project, p, missing)}\n</style>`;
  });
  // Scripts
  out = await replaceAsync(out, /<script\b([^>]*)\ssrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, async (tag, before, src, after) => {
    if (!isLocal(src)) return tag;
    const js = await project.readFile(project.resolvePath(from, src));
    if (js === null) { missing.add(src); return tag; }
    const attrs = (before + after).replace(/\s(?:defer|async)(?=\s|$)/gi, '');
    return `<script${attrs}>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;
  });
  // Pictures, audio, video and icons
  out = await replaceAsync(out, /(<(?:img|source|audio|video|input)\b[^>]*\ssrc=|<link\b[^>]*\shref=|<video\b[^>]*\sposter=)(["'])([^"']+)\2/gi, async (all, pre, q, ref) => {
    if (!isLocal(ref) || /\.(?:css|html?)$/i.test(ref)) return all;
    const p = project.resolvePath(from, ref);
    const bytes = await project.readBytes(p);
    if (!bytes) { missing.add(ref); return all; }
    return `${pre}${q}${toDataUrl(p, bytes)}${q}`;
  });
  // url(...) inside <style> blocks and style="" attributes
  out = await replaceAsync(out, /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, async (_a, open, css, close) => open + await inlineCssUrls(css, project, from, missing) + close);
  out = await replaceAsync(out, /(\sstyle=")([^"]*url\([^"]*)(")/gi, async (_a, pre, css, post) => pre + (await inlineCssUrls(css.replace(/&quot;/g, "'"), project, from, missing)).replace(/"/g, "'") + post);
  return { html: out, missing: Array.from(missing) };
}

// ---------- Saving ----------
/** Saves bytes as a download (web) or through the Save dialog (Windows app). Resolves false if cancelled. */
export async function saveBytes(name: string, bytes: Uint8Array, kind: 'zip' | 'html'): Promise<boolean> {
  if (isDesktop()) {
    const saved = await window.__TAURI__!.core!.invoke('save_bytes_as', { suggestedName: name, bytes: Array.from(bytes), kind });
    return !!saved;
  }
  const blob = new Blob([bytes as BlobPart], { type: kind === 'zip' ? 'application/zip' : 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
