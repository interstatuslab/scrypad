import { fileToDataUrl } from '../tools/image-inliner.ts';

export interface ActiveElementStyles {
  padding: string;
  margin: string;
  borderRadius: string;
  fontSize: string;
  letterSpacing: string;
  color: string;
  backgroundColor: string;
  opacity: string;
  clipPath?: string;
  fontFamily: string;
  fontWeight: string;
  lineHeight: string;
  textAlign: string;
  /** Only the element's own width setting (style=""), not the measured width */
  width: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  boxShadow: string;
}

export interface ActiveElementInfo {
  tagName: string;
  id: string;
  className: string;
  domPath: string;
  /** Which one of its kind it is in the page (0 = the first <p>), used by Click to Find */
  ordinal: number;
  styles: ActiveElementStyles;
}

export interface PreviewOptions {
  container: HTMLElement;
  onVisualDocChange: (newHtml: string) => void;
  onSelectElement: (domPath: string) => void;
  onActiveElementChange?: (info: ActiveElementInfo | null) => void;
  onImageDropped?: (dataUrl: string, fileName: string) => void;
}

export class PreviewPane {
  private iframe: HTMLIFrameElement;
  private visualEditMode: boolean = true;
  private onVisualDocChange: (newHtml: string) => void;
  private onSelectElement: (domPath: string) => void;
  private onActiveElementChange?: (info: ActiveElementInfo | null) => void;
  private onImageDropped?: (dataUrl: string, fileName: string) => void;
  private isWritingToIframe: boolean = false;
  private activeElement: HTMLElement | null = null;
  private currentThemeMode: 'auto' | 'dark' | 'light' = 'auto';

  constructor(options: PreviewOptions) {
    this.onVisualDocChange = options.onVisualDocChange;
    this.onSelectElement = options.onSelectElement;
    this.onActiveElementChange = options.onActiveElementChange;
    this.onImageDropped = options.onImageDropped;

    this.iframe = document.createElement('iframe');
    this.iframe.className = "w-full h-full bg-white rounded shadow-2xl border border-slate-800 transition-all duration-150";
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-modals');
    options.container.appendChild(this.iframe);
  }

  public setVisualEditMode(enabled: boolean) {
    this.visualEditMode = enabled;
    const doc = this.getDoc();
    if (doc && doc.body) {
      doc.body.contentEditable = enabled ? "true" : "false";
    }
  }

  public isVisualEditActive(): boolean {
    return this.visualEditMode;
  }

  public setViewportWidth(width: string) {
    this.iframe.style.width = width;
  }

  // Pop Out Preview: a second window that mirrors the preview as you work
  private mirror: Window | null = null;
  private lastHtml = '';
  private mirrorTimer: number | undefined;

  /** Opens (or focuses) the pop-out window. Returns false when the browser blocked it. */
  public openPopOut(): boolean {
    if (this.mirror && !this.mirror.closed) { this.mirror.focus(); return true; }
    const w = window.open('', 'scrypad-preview', 'popup,width=960,height=720');
    if (!w) return false;
    this.mirror = w;
    this.writeMirror(this.lastHtml);
    return true;
  }

  public isPoppedOut(): boolean {
    return !!this.mirror && !this.mirror.closed;
  }

  private scheduleMirror(html: string) {
    this.lastHtml = html;
    if (!this.mirror) return;
    window.clearTimeout(this.mirrorTimer);
    this.mirrorTimer = window.setTimeout(() => this.writeMirror(this.lastHtml), 200);
  }

  private writeMirror(html: string) {
    if (!this.mirror || this.mirror.closed) { this.mirror = null; return; }
    try {
      const d = this.mirror.document;
      const x = this.mirror.scrollX, y = this.mirror.scrollY;
      d.open();
      d.write(html.trim() ? html : '<!DOCTYPE html><title>ScryPad Preview</title><body style="font-family:sans-serif;color:#888;display:grid;place-items:center;height:90vh;margin:0">Your page will show up here.</body>');
      d.close();
      if (!d.title) d.title = 'ScryPad Preview';
      this.mirror.scrollTo(x, y);
    } catch {
      this.mirror = null;
    }
  }

  public render(html: string) {
    this.scheduleMirror(html);
    this.activeElement = null;
    this.isWritingToIframe = true;
    const doc = this.getDoc();
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    this.attachIframeEvents(doc);
    this.applyCurrentTheme(doc);
    // Linked stylesheets arrive a moment later
    doc.defaultView?.addEventListener('load', () => this.applyCurrentTheme(doc), { once: true });
    this.isWritingToIframe = false;
  }

  public applyStyleCommand(command: string, value: string | null = null, range?: Range) {
    const win = this.iframe.contentWindow;
    if (win) {
      win.focus();
      if (range) {
        // Put back a selection that a dialog took away
        const sel = win.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      win.document.execCommand(command, false, value ?? undefined);
      this.notifyDocChange();
    }
  }

  public getActiveElement(): HTMLElement | null {
    return this.activeElement;
  }

  /** The page's document, for small edits like adding a font link */
  public getDocument(): Document | null {
    return this.getDoc();
  }

  /** Make a change to the page (like a new link address), then sync it to the code. */
  public editElement(change: () => void) {
    change();
    this.notifyDocChange();
  }

  public updateActiveElementStyle(property: string, value: string) {
    if (!this.activeElement) return;
    Object.assign(this.activeElement.style, { [property]: value });
    this.notifyDocChange();
  }

  public setThemeSimulation(mode: 'auto' | 'dark' | 'light') {
    this.currentThemeMode = mode;
    const doc = this.getDoc();
    if (doc) {
      this.applyCurrentTheme(doc);
    }
  }

  public getThemeSimulation(): 'auto' | 'dark' | 'light' {
    return this.currentThemeMode;
  }

  public bakeThemeSimulation(): void {
    if (this.currentThemeMode === 'auto') return;
    const doc = this.getDoc();
    if (!doc) return;

    const root = doc.documentElement;
    if (this.currentThemeMode === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else if (this.currentThemeMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    }

    this.notifyDocChange();
  }

  // Light/Dark preview: the iframe's own color-scheme is what the page's
  // @media (prefers-color-scheme) rules follow, so the page itself is never changed
  // (nothing leaks into your code; "Keep This Theme" writes it in on purpose).
  private originalMedia = new WeakMap<CSSMediaRule, string>();

  private applyCurrentTheme(doc: Document) {
    const mode = this.currentThemeMode;
    this.iframe.style.colorScheme = mode === 'auto' ? '' : mode;
    // Browsers don't let a page pretend the system is light or dark, so ScryPad
    // flips the page's own (prefers-color-scheme) rules in the live preview only.
    // This changes the browser's copy of the styles, never the text of your code.
    const flip = (text: string) => {
      if (mode === 'auto') return text;
      const other = mode === 'dark' ? 'light' : 'dark';
      return text
        .replace(new RegExp(`\\(\\s*prefers-color-scheme\\s*:\\s*${mode}\\s*\\)`, 'gi'), '(min-width: 0px)')
        .replace(new RegExp(`\\(\\s*prefers-color-scheme\\s*:\\s*${other}\\s*\\)`, 'gi'), '(max-width: -1px)');
    };
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (doc.defaultView && rule instanceof doc.defaultView.CSSMediaRule) {
          const mr = rule as CSSMediaRule;
          if (!this.originalMedia.has(mr)) this.originalMedia.set(mr, mr.media.mediaText);
          const original = this.originalMedia.get(mr)!;
          if (/prefers-color-scheme/i.test(original)) {
            const next = flip(original);
            if (mr.media.mediaText !== next) mr.media.mediaText = next;
          }
        }
        if ((rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(doc.styleSheets)) {
      try { walk(sheet.cssRules); } catch { /* a stylesheet from another site can't be read */ }
    }
  }

  private getDoc(): Document | null {
    try {
      return this.iframe.contentDocument || this.iframe.contentWindow?.document || null;
    } catch {
      return null;
    }
  }

  private notifyDocChange() {
    if (this.isWritingToIframe) return;
    const doc = this.getDoc();
    if (!doc) return;
    const docType = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>\n` : '<!DOCTYPE html>\n';
    // Leave out ScryPad's own editing switches so they never end up in your code
    const root = doc.documentElement.cloneNode(true) as HTMLElement;
    root.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    root.querySelectorAll('[style=""]').forEach((el) => el.removeAttribute('style'));
    // Put back the real stylesheet links and picture paths the preview swapped in for display
    root.querySelectorAll('style[data-scrypad-href]').forEach((st) => {
      const link = doc.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', st.getAttribute('data-scrypad-href') || '');
      st.replaceWith(link);
    });
    root.querySelectorAll('img[data-scrypad-src]').forEach((img) => {
      img.setAttribute('src', img.getAttribute('data-scrypad-src') || '');
      img.removeAttribute('data-scrypad-src');
    });
    if (root.getAttribute('style') === '') root.removeAttribute('style');
    const serialized = docType + root.outerHTML;
    this.scheduleMirror(serialized);
    this.onVisualDocChange(serialized);
  }

  private attachIframeEvents(doc: Document) {
    if (!doc.body) return;

    // Apply current visual edit mode
    doc.body.contentEditable = this.visualEditMode ? "true" : "false";

    // Track selection changes and active elements
    const handleElementSelection = (el: HTMLElement) => {
      this.activeElement = el;
      const path = this.computeDomPath(el);
      this.onSelectElement(path);

      if (this.onActiveElementChange) {
        const win = this.iframe.contentWindow;
        const computed = win ? win.getComputedStyle(el) : null;
        this.onActiveElementChange({
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          domPath: path,
          ordinal: Array.prototype.indexOf.call(doc.getElementsByTagName(el.tagName), el),
          styles: {
            padding: computed?.padding || el.style.padding || '',
            margin: computed?.margin || el.style.margin || '',
            borderRadius: computed?.borderRadius || el.style.borderRadius || '',
            fontSize: computed?.fontSize || el.style.fontSize || '',
            letterSpacing: computed?.letterSpacing || el.style.letterSpacing || '',
            color: computed?.color || el.style.color || '',
            backgroundColor: computed?.backgroundColor || el.style.backgroundColor || '',
            opacity: computed?.opacity || el.style.opacity || '1',
            clipPath: el.style.clipPath || computed?.clipPath || '',
            fontFamily: el.style.fontFamily || '',
            fontWeight: computed?.fontWeight || '',
            lineHeight: computed?.lineHeight || '',
            textAlign: el.style.textAlign || '',
            width: el.style.width || '',
            borderWidth: computed?.borderTopWidth || '',
            borderStyle: computed?.borderTopStyle || '',
            borderColor: computed?.borderTopColor || '',
            boxShadow: el.style.boxShadow || ''
          }
        });
      }
    };

    doc.addEventListener('selectionchange', () => {
      const win = this.iframe.contentWindow;
      const sel = win?.getSelection();
      if (sel && sel.anchorNode) {
        const el = sel.anchorNode.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : (sel.anchorNode as HTMLElement);
        if (el) {
          handleElementSelection(el);
        }
      }
    });

    doc.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName) {
        handleElementSelection(target);
      }
    });

    // Track mouse hover for subtle DOM breadcrumbs when moving around
    doc.addEventListener('mousemove', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName) {
        const sel = this.iframe.contentWindow?.getSelection();
        if (!sel || sel.isCollapsed) {
          this.onSelectElement(this.computeDomPath(target));
        }
      }
    });

    // Drag and drop image support
    doc.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    doc.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          try {
            const dataUrl = await fileToDataUrl(file);
            const target = e.target as HTMLElement;
            if (target && target.tagName.toUpperCase() === 'IMG') {
              (target as HTMLImageElement).src = dataUrl;
            } else {
              const img = doc.createElement('img');
              img.src = dataUrl;
              img.alt = file.name;
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              if (target && target !== doc.body) {
                target.appendChild(img);
              } else {
                doc.body.appendChild(img);
              }
            }
            this.notifyDocChange();
            if (this.onImageDropped) {
              this.onImageDropped(dataUrl, file.name);
            }
          } catch (err) {
            console.error('Failed to embed dropped image:', err);
          }
        }
      }
    });

    // Listen to direct text typing / mutations inside the iframe
    doc.body.addEventListener('input', () => {
      this.notifyDocChange();
    });
  }

  private computeDomPath(el: HTMLElement): string {
    const path: string[] = [];
    let curr: HTMLElement | null = el;
    while (curr && curr.tagName && curr.tagName.toUpperCase() !== 'HTML') {
      let segment = curr.tagName.toLowerCase();
      if (curr.id) {
        segment += `#${curr.id}`;
      } else if (curr.className && typeof curr.className === 'string') {
        const first = curr.className.trim().split(/\s+/)[0];
        if (first && !first.includes(':') && !first.includes('[')) {
          segment += `.${first}`;
        }
      }
      path.unshift(segment);
      curr = curr.parentElement;
    }
    return path.join(' > ') || 'body';
  }
}
