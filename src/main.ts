import { 
  createIcons, 
  FilePlus, 
  FolderOpen, 
  Save, 
  FileCode, 
  BookCopy, 
  Sparkles, 
  MousePointerClick, 
  Code, 
  Eye, 
  AlertTriangle,
  X,
  Palette,
  Sun,
  Moon,
  SlidersHorizontal,
  ClipboardCopy,
  Check,
  FolderTree,
  Undo2,
  Redo2,
  Search,
  Replace,
  BookOpen,
  Sparkle,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Gamepad2,
  Menu,
  SaveAll,
  Columns2,
  Monitor,
  Tablet,
  Smartphone,
  WrapText,
  Compass,
  Keyboard,
  FileSearch,
  MessageCircle,
  Info,
  Link,
  Image as ImageIcon,
  ExternalLink,
  FolderArchive,
  Globe,
  Minus,
  RemoveFormatting
} from 'lucide';
import { CodePane } from './editor/code-pane.ts';
import { PreviewPane, ActiveElementInfo } from './preview/preview-pane.ts';
import { FileManager, FileState } from './files/file-manager.ts';
import type { ProjectFolder, ProjectFileEntry } from './files/project-folder.ts';
import { SyncCoordinator } from './sync/sync-coordinator.ts';
import { CDN_LIBRARIES, injectSnippetIntoHtml } from './libraries/cdn-catalog.ts';
import { extractPalette, replaceColor, ColorSwatch } from './tools/palette-scanner.ts';
import { detectUnlinkedFonts, injectGoogleFont, UnlinkedFont, POPULAR_GOOGLE_FONTS } from './tools/font-detector.ts';
import { findUnembeddedImages, inlineImageInHtml, fileToDataUrl, UnembeddedImage } from './tools/image-inliner.ts';
import { extractCleanBody } from './tools/body-exporter.ts';
import { HTML_TAG_DICTIONARY, findTagInfo, TagInfo } from './tools/tag-dictionary.ts';
import { htmlToGodotBBCode } from './tools/godot-exporter.ts';
import { showDialog, confirmDialog, copyOrShow, isDialogOpen } from './ui/dialog.ts';
import { desktopLaunchFile } from './files/desktop.ts';
import { showTour, hasSeenTour, isTourOpen } from './ui/tour.ts';
import { listRecent, rememberFile, forgetFile, clearRecent, RecentFile } from './files/recent-files.ts';
import { createElement as lucideIcon, History } from 'lucide';
import { openExportModal } from './ui/export-modal.ts';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Render Lucide Icons (Tree-shaken)
  createIcons({
    icons: {
      Link,
      Image: ImageIcon,
      ExternalLink,
      FolderArchive,
      Globe,
      Minus,
      RemoveFormatting,
      FilePlus,
      FolderOpen,
      Save,
      FileCode,
      BookCopy,
      Sparkles,
      MousePointerClick,
      Code,
      Eye,
      AlertTriangle,
      X,
      Palette,
      Sun,
      Moon,
      SlidersHorizontal,
      ClipboardCopy,
      Check,
      FolderTree,
      Undo2,
      Redo2,
      Search,
      Replace,
      BookOpen,
      Sparkle,
      HelpCircle,
      ChevronUp,
      ChevronDown,
      Gamepad2,
      Menu,
      SaveAll,
      Columns2,
      Monitor,
      Tablet,
      Smartphone,
      WrapText,
      Compass,
      Keyboard,
      FileSearch,
      MessageCircle,
      Info
    }
  });

  // PWA Service Worker Registration
  // Not on itch.io: it serves many games from one address, and its own player handles loading
  const onItch = /(^|\.)itch\.(io|zone)$/.test(location.hostname);
  // Not in the Windows app either: its files are built in, and an old worker left behind by an
  // earlier version can keep showing that old version. Remove any such worker and its cache once.
  const inDesktopApp = !!window.__TAURI__ || !!window.__TAURI_INTERNALS__;
  if ('serviceWorker' in navigator && inDesktopApp) {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (!regs.length) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      location.reload();
    }).catch(() => { /* nothing to clean up */ });
  }
  if ('serviceWorker' in navigator && !onItch && !inDesktopApp) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('PWA service worker registration failed:', err);
      });
    });
  }

  // File Manager
  const fileManager = new FileManager();

  // Elements
  const codeMount = document.getElementById('code-mount')!;
  const previewMount = document.getElementById('preview-mount')!;
  const activeFilename = document.getElementById('active-filename')!;
  const dirtyIndicator = document.getElementById('dirty-indicator')!;
  const toggleVisualEdit = document.getElementById('toggle-visual-edit') as HTMLInputElement;
  const previewModeTag = document.getElementById('preview-mode-tag')!;
  const quickColor = document.getElementById('quick-color') as HTMLInputElement;

  // Style Drawer Elements
  const styleDrawer = document.getElementById('style-drawer')!;
  const btnToggleStyles = document.getElementById('btn-toggle-styles')!;
  const btnCloseStyleDrawer = document.getElementById('btn-close-style-drawer')!;
  const drawerElementTag = document.getElementById('drawer-element-tag')!;
  const sliderFontSize = document.getElementById('slider-font-size') as HTMLInputElement;
  const valFontSize = document.getElementById('val-font-size')!;
  const sliderPadding = document.getElementById('slider-padding') as HTMLInputElement;
  const valPadding = document.getElementById('val-padding')!;
  const sliderMargin = document.getElementById('slider-margin') as HTMLInputElement;
  const valMargin = document.getElementById('val-margin')!;
  const sliderRadius = document.getElementById('slider-radius') as HTMLInputElement;
  const valRadius = document.getElementById('val-radius')!;
  const sliderSpacing = document.getElementById('slider-spacing') as HTMLInputElement;
  const valSpacing = document.getElementById('val-spacing')!;
  const sliderOpacity = document.getElementById('slider-opacity') as HTMLInputElement;
  const valOpacity = document.getElementById('val-opacity')!;
  const pickerTextColor = document.getElementById('picker-text-color') as HTMLInputElement;
  const valTextColor = document.getElementById('val-text-color')!;
  const pickerBgColor = document.getElementById('picker-bg-color') as HTMLInputElement;
  const valBgColor = document.getElementById('val-bg-color')!;

  // Theme Simulator Elements
  const btnThemeSim = document.getElementById('btn-theme-sim')!;
  const themeSimLabel = document.getElementById('theme-sim-label')!;

  // Toast Helper
  const hudToast = document.getElementById('hud-toast')!;
  const hudToastMsg = document.getElementById('hud-toast-msg')!;
  let toastTimeout: ReturnType<typeof setTimeout> | undefined;

  function showToast(message: string, durationMs = 2600) {
    if (toastTimeout) clearTimeout(toastTimeout);
    hudToastMsg.textContent = message;
    hudToast.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      hudToast.classList.add('hidden');
    }, durationMs);
  }

  let coordinator: SyncCoordinator;

  function escapeHtml(t: string): string {
    return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }
  function clearDraft() {
    try { localStorage.removeItem('scrypad_draft'); } catch { /* ignore */ }
  }

  // Blank Page screen (Dusk Wisp): shown over the preview while the page is empty
  const blankPage = document.getElementById('blank-page');
  function updateBlankPage(code: string) {
    if (!blankPage) return;
    blankPage.classList.toggle('hidden', code.trim().length > 0);
  }

  // Phones get Code / Preview tabs instead of a side-by-side split
  const phoneQuery = window.matchMedia('(max-width: 767px)');

  // Initialize Code Editor
  const codePane = new CodePane({
    container: codeMount,
    initialValue: '',
    onDocChange: (code) => {
      if (coordinator) coordinator.handleCodeChange(code);
      checkDocumentIntegrity(code);
    },
    // The Blank Page shows whenever the editor is empty, however the text changed
    onAnyChange: (code) => { updateBlankPage(code); window.setTimeout(() => updateEditChip(), 450); }
  });

  let updateTagHint: (tagName: string) => void = () => {};
  let updateEditChip: () => void = () => {};
  let lastFoundKey = '';

  // Initialize Preview Pane
  const previewPane = new PreviewPane({
    container: previewMount,
    onVisualDocChange: (html) => {
      if (coordinator) coordinator.handleVisualChange(html);
    },
    onSelectElement: (domPath) => {
      if (coordinator) coordinator.handleDomPathSelect(domPath);
    },
    onActiveElementChange: (info: ActiveElementInfo | null) => {
      if (!info) {
        lastFoundKey = '';
        updateTagHint('');
        updateEditChip();
        return;
      }
      populateStyleDrawer(info);
      updateTagHint(info.tagName);
      updateEditChip();
      // Click to Find: show where this element lives in the code (once per newly clicked element)
      const key = info.tagName + '#' + info.ordinal;
      if (key !== lastFoundKey) {
        lastFoundKey = key;
        codePane.revealTag(info.tagName, info.ordinal);
      }
    },
    onImageDropped: (_dataUrl, fileName) => {
      showToast(`✦ Embedded image: ${fileName}`);
      coordinator.updateStats();
      fileManager.markDirty(true);
    }
  });

  // Coordinator
  coordinator = new SyncCoordinator(codePane, previewPane, fileManager);

  // Start on the Blank Page (Wisp) instead of a sample page
  previewPane.render('');
  updateBlankPage('');

  // Smart Helper Action Bar & Inputs
  const smartHelperBanner = document.getElementById('smart-helper-banner')!;
  const smartHelperMsg = document.getElementById('smart-helper-msg')!;
  const btnHelperActionCss = document.getElementById('btn-helper-action-css')!;
  const btnHelperActionImg = document.getElementById('btn-helper-action-img')!;
  const btnHelperActionFont = document.getElementById('btn-helper-action-font')!;
  const btnDismissHelper = document.getElementById('btn-dismiss-helper')!;
  const cssFileInput = document.getElementById('css-file-input') as HTMLInputElement;
  const imgFileInput = document.getElementById('img-file-input') as HTMLInputElement;

  let currentPendingTargetImgSrc: string | null = null;
  let currentPendingFont: UnlinkedFont | null = null;

  function checkDocumentIntegrity(code: string) {
    if (!smartHelperBanner || !smartHelperMsg) return;

    // Reset helper buttons
    btnHelperActionCss.classList.add('hidden');
    btnHelperActionCss.style.display = 'none';
    btnHelperActionImg.classList.add('hidden');
    btnHelperActionImg.style.display = 'none';
    btnHelperActionFont.classList.add('hidden');
    btnHelperActionFont.style.display = 'none';

    // 1. Check relative stylesheet link
    const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/|\/\/)([^"']+)["'][^>]*>/i;
    const cssMatch = code.match(cssRegex);
    if (cssMatch) {
      const href = cssMatch[1];
      if (!fileManager.hasCss(href)) {
        smartHelperMsg.innerHTML = `Unlinked stylesheet: <code class="text-[var(--ink)] bg-[var(--void)] px-1.5 py-0.5 rounded border border-[var(--line)]">${href}</code>. In a web sandbox, relative files cannot load unless embedded.`;
        btnHelperActionCss.classList.remove('hidden');
        btnHelperActionCss.style.display = 'inline-flex';
        smartHelperBanner.classList.remove('hidden');
        smartHelperBanner.style.display = 'flex';
        return;
      }
    }

    // 2. Check unembedded local images
    const unembeddedImages: UnembeddedImage[] = findUnembeddedImages(code);
    if (unembeddedImages.length > 0) {
      currentPendingTargetImgSrc = unembeddedImages[0].src;
      smartHelperMsg.innerHTML = `Local image detected: <code class="text-[var(--ink)] bg-[var(--void)] px-1.5 py-0.5 rounded border border-[var(--line)]">${currentPendingTargetImgSrc}</code>. Convert it to a Base64 data URI to display it anywhere!`;
      btnHelperActionImg.classList.remove('hidden');
      btnHelperActionImg.style.display = 'inline-flex';
      smartHelperBanner.classList.remove('hidden');
      smartHelperBanner.style.display = 'flex';
      return;
    }

    // 3. Check unlinked Google Fonts
    const unlinkedFonts: UnlinkedFont[] = detectUnlinkedFonts(code);
    if (unlinkedFonts.length > 0) {
      currentPendingFont = unlinkedFonts[0];
      smartHelperMsg.innerHTML = `Google Font <strong class="text-[var(--ink)]">${currentPendingFont.fontName}</strong> used in CSS without a linked Google stylesheet.`;
      btnHelperActionFont.classList.remove('hidden');
      btnHelperActionFont.style.display = 'inline-flex';
      smartHelperBanner.classList.remove('hidden');
      smartHelperBanner.style.display = 'flex';
      return;
    }

    // All good
    smartHelperBanner.classList.add('hidden');
    smartHelperBanner.style.display = 'none';
  }

  btnDismissHelper.addEventListener('click', () => {
    smartHelperBanner.classList.add('hidden');
    smartHelperBanner.style.display = 'none';
  });

  // Action: Embed Local CSS
  btnHelperActionCss.addEventListener('click', () => {
    cssFileInput.click();
  });

  cssFileInput.addEventListener('change', async () => {
    const file = cssFileInput.files?.[0];
    if (!file) return;
    const cssText = await file.text();
    let currentCode = codePane.getValue();
    const regex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/|\/\/)([^"']+)["'][^>]*>/i;
    const match = currentCode.match(regex);
    const targetHref = match ? match[1] : file.name;

    // Register into persistent cache so returning to this or other HTML files never requires re-embedding!
    fileManager.registerCss(file.name, cssText, targetHref);

    if (match) {
      currentCode = currentCode.replace(regex, `<style data-source="${file.name}">\n/* --- Inlined ${file.name} --- */\n${cssText}\n</style>`);
    } else {
      currentCode = `<style data-source="${file.name}">\n/* --- Inlined ${file.name} --- */\n${cssText}\n</style>\n${currentCode}`;
    }
    codePane.setValue(currentCode);
    const resolved = await fileManager.resolvePreview(currentCode);
    previewPane.render(resolved);
    coordinator.updateStats();
    fileManager.markDirty(true);
    fileManager.bufferCurrentFile(currentCode);
    checkDocumentIntegrity(currentCode);
    showToast(`✦ Inlined and cached stylesheet: ${file.name}`);
  });

  // Action: Embed Local Image
  btnHelperActionImg.addEventListener('click', () => {
    imgFileInput.click();
  });

  imgFileInput.addEventListener('change', async () => {
    const file = imgFileInput.files?.[0];
    if (!file || !currentPendingTargetImgSrc) return;
    try {
      const dataUri = await fileToDataUrl(file);
      const currentCode = codePane.getValue();
      const updatedCode = inlineImageInHtml(currentCode, currentPendingTargetImgSrc, dataUri);
      codePane.setValue(updatedCode);
      previewPane.render(updatedCode);
      coordinator.updateStats();
      fileManager.markDirty(true);
      checkDocumentIntegrity(updatedCode);
      showToast(`✦ Embedded image: ${file.name}`);
    } catch (err) {
      console.error(err);
    }
  });

  // Action: Inject Google Font
  btnHelperActionFont.addEventListener('click', () => {
    if (!currentPendingFont) return;
    const currentCode = codePane.getValue();
    const updatedCode = injectGoogleFont(currentCode, currentPendingFont.fontName, currentPendingFont.query);
    codePane.setValue(updatedCode);
    previewPane.render(updatedCode);
    coordinator.updateStats();
    fileManager.markDirty(true);
    checkDocumentIntegrity(updatedCode);
    showToast(`✦ Injected Google Font: ${currentPendingFont.fontName}`);
  });

  // File Manager UI Subscription
  fileManager.subscribe((state: FileState) => {
    activeFilename.textContent = state.name;
    if (state.isDirty) {
      dirtyIndicator.classList.remove('hidden');
      document.title = `* ${state.name} ✦ ScryPad`;
    } else {
      dirtyIndicator.classList.add('hidden');
      document.title = `${state.name} ✦ ScryPad`;
    }
    const curProj = fileManager.getProject();
    if (curProj) {
      renderProjectFiles(curProj);
    }
  });

  // Project Folder Handling
  const projectDrawer = document.getElementById('project-drawer')!;
  const projectFolderName = document.getElementById('project-folder-name')!;
  const projectFileList = document.getElementById('project-file-list')!;
  const btnOpenFolder = document.getElementById('btn-open-folder')!;
  const btnCloseProject = document.getElementById('btn-close-project')!;
  const folderInput = document.getElementById('folder-input') as HTMLInputElement;

  const projectSearchInput = document.getElementById('project-search') as HTMLInputElement | null;
  const btnClearProjectSearch = document.getElementById('btn-clear-project-search');
  const btnViewTree = document.getElementById('btn-view-tree');
  const btnViewType = document.getElementById('btn-view-type');
  const btnExpandAll = document.getElementById('btn-expand-all');
  const btnCollapseAll = document.getElementById('btn-collapse-all');
  const projectFileCount = document.getElementById('project-file-count');

  let projectTreeMode: 'tree' | 'type' = 'tree';
  let projectSearchQuery: string = '';
  const collapsedFolders: Set<string> = new Set();

  interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: TreeNode[];
    fileEntry?: ProjectFileEntry;
    kind?: string;
  }

  function buildFileTree(files: ProjectFileEntry[]): TreeNode[] {
    const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isLast) {
          current.children.push({
            name: part,
            path: file.path,
            isFolder: false,
            children: [],
            fileEntry: file,
            kind: file.kind
          });
        } else {
          let folder = current.children.find(c => c.isFolder && c.name === part);
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: []
            };
            current.children.push(folder);
          }
          current = folder;
        }
      }
    }

    function sortNodes(nodes: TreeNode[]) {
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) {
          return a.isFolder ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
      for (const node of nodes) {
        if (node.isFolder) {
          sortNodes(node.children);
        }
      }
    }

    sortNodes(root.children);
    return root.children;
  }

  function countFilesInTree(node: TreeNode): number {
    if (!node.isFolder) return 1;
    return node.children.reduce((acc, c) => acc + countFilesInTree(c), 0);
  }

  function collectAllFolderPaths(nodes: TreeNode[], acc: Set<string> = new Set()): Set<string> {
    for (const n of nodes) {
      if (n.isFolder) {
        acc.add(n.path);
        collectAllFolderPaths(n.children, acc);
      }
    }
    return acc;
  }

  function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    const result: TreeNode[] = [];

    for (const node of nodes) {
      if (!node.isFolder) {
        if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
          result.push(node);
        }
      } else {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          result.push({
            ...node,
            children: filteredChildren
          });
        }
      }
    }
    return result;
  }

  const TYPE_GROUPS = [
    { id: 'html', label: 'HTML Documents', color: '#c56bff', badge: 'text-[var(--forge)] bg-[color-mix(in_srgb,var(--forge)_10%,transparent)] border-[color-mix(in_srgb,var(--forge)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--forge)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` },
    { id: 'css', label: 'Stylesheets', color: '#f2d27a', badge: 'text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] border-[color-mix(in_srgb,var(--gold)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--gold)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>` },
    { id: 'js', label: 'Scripts', color: '#d896ff', badge: 'text-[var(--forge-hi)] bg-[color-mix(in_srgb,var(--forge-hi)_10%,transparent)] border-[color-mix(in_srgb,var(--forge-hi)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--forge-hi)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/><path d="M4 17V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/></svg>` },
    { id: 'image', label: 'Images & Media', color: '#8fb6ff', badge: 'text-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] border-[color-mix(in_srgb,var(--blue)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--blue)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>` },
    { id: 'font', label: 'Web Fonts', color: '#ff7be5', badge: 'text-[var(--pink)] bg-[color-mix(in_srgb,var(--pink)_10%,transparent)] border-[color-mix(in_srgb,var(--pink)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--pink)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>` },
    { id: 'other', label: 'Other Assets', color: '#a597c2', badge: 'text-[var(--dim)] bg-[color-mix(in_srgb,var(--dim)_10%,transparent)] border-[color-mix(in_srgb,var(--dim)_30%,transparent)]', icon: `<svg class="w-3.5 h-3.5 text-[var(--dim)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 2 2h4"/></svg>` }
  ];

  function renderTreeHtml(nodes: TreeNode[], depth: number, activePath: string | null): string {
    let out = '';
    for (const node of nodes) {
      const indent = depth * 14;
      if (node.isFolder) {
        const isCollapsed = projectSearchQuery ? false : collapsedFolders.has(node.path);
        const count = countFilesInTree(node);
        const caretSvg = isCollapsed
          ? `<svg class="w-3 h-3 text-[var(--faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`
          : `<svg class="w-3 h-3 text-[var(--faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`;
        const folderSvg = isCollapsed
          ? `<svg class="w-3.5 h-3.5 text-[var(--gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`
          : `<svg class="w-3.5 h-3.5 text-[var(--gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><circle cx="12" cy="13" r="2"/></svg>`;

        out += `
          <div class="tree-folder-group">
            <button class="tree-folder-toggle w-full px-1.5 py-1 rounded flex items-center justify-between text-left hover:bg-[var(--panel-hi)] transition text-[var(--dim)] hover:text-[var(--ink)]" data-folder-path="${node.path}" style="padding-left: ${indent + 4}px">
              <span class="flex items-center gap-1.5 truncate">
                <span class="shrink-0">${caretSvg}</span>
                <span class="shrink-0">${folderSvg}</span>
                <span class="font-bold text-xs truncate text-[var(--moonsilver)]">${node.name}</span>
              </span>
              <span class="text-[9px] text-[var(--faint)] bg-[var(--panel)] px-1 rounded ml-1 border border-[var(--line)] shrink-0">${count}</span>
            </button>
            <div class="tree-folder-children ${isCollapsed ? 'hidden' : ''}">
              ${renderTreeHtml(node.children, depth + 1, activePath)}
            </div>
          </div>
        `;
      } else {
        const f = node.fileEntry;
        if (!f) continue;
        const isAct = (activePath && (activePath === f.path || activePath === f.name));
        const badgeColor = f.kind === 'html' ? 'text-[var(--forge)] bg-[color-mix(in_srgb,var(--forge)_10%,transparent)] border-[color-mix(in_srgb,var(--forge)_30%,transparent)]'
          : f.kind === 'css' ? 'text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] border-[color-mix(in_srgb,var(--gold)_30%,transparent)]'
          : f.kind === 'js' ? 'text-[var(--forge-hi)] bg-[color-mix(in_srgb,var(--forge-hi)_10%,transparent)] border-[color-mix(in_srgb,var(--forge-hi)_30%,transparent)]'
          : 'text-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] border-[color-mix(in_srgb,var(--blue)_30%,transparent)]';

        const fileIcon = f.kind === 'html'
          ? `<svg class="w-3.5 h-3.5 text-[var(--forge)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
          : f.kind === 'css'
          ? `<svg class="w-3.5 h-3.5 text-[var(--gold)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`
          : f.kind === 'js'
          ? `<svg class="w-3.5 h-3.5 text-[var(--forge-hi)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/><path d="M4 17V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/></svg>`
          : f.kind === 'image'
          ? `<svg class="w-3.5 h-3.5 text-[var(--blue)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`
          : `<svg class="w-3.5 h-3.5 text-[var(--dim)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 2 2h4"/></svg>`;

        out += `
          <button class="project-file-item w-full px-1.5 py-1 rounded flex items-center justify-between text-left hover:bg-[var(--panel-hi)] transition ${isAct ? 'bg-[var(--panel-hi)] border border-[color-mix(in_srgb,var(--forge)_60%,transparent)] text-[var(--ink)] font-bold' : 'text-[var(--dim)]'}" data-path="${f.path}" style="padding-left: ${indent + 18}px" title="${f.path}">
            <span class="flex items-center gap-1.5 truncate flex-1 min-w-0">
              ${fileIcon}
              <span class="truncate text-xs">${node.name}</span>
            </span>
            <span class="text-[9px] uppercase px-1 py-0.2 border rounded ml-1 shrink-0 ${badgeColor}">${f.kind}</span>
          </button>
        `;
      }
    }
    return out;
  }

  function renderGroupedHtml(files: ProjectFileEntry[], activePath: string | null): string {
    const q = projectSearchQuery.toLowerCase();
    const filteredFiles = q
      ? files.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      : files;

    let out = '';
    for (const group of TYPE_GROUPS) {
      const groupFiles = filteredFiles.filter((f) => f.kind === group.id);
      if (groupFiles.length === 0) continue;

      const groupKey = `group_${group.id}`;
      const isCollapsed = projectSearchQuery ? false : collapsedFolders.has(groupKey);
      const caretSvg = isCollapsed
        ? `<svg class="w-3 h-3 text-[var(--faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`
        : `<svg class="w-3 h-3 text-[var(--faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`;

      out += `
        <div class="type-folder-group">
          <button class="type-group-toggle w-full px-2 py-1.5 rounded flex items-center justify-between text-left hover:bg-[var(--panel-hi)] transition text-[var(--dim)] hover:text-[var(--ink)]" data-group-key="${groupKey}">
            <span class="flex items-center gap-1.5 truncate">
              <span class="shrink-0">${caretSvg}</span>
              <span class="shrink-0">${group.icon}</span>
              <span class="font-bold text-xs truncate text-[var(--moonsilver)]">${group.label}</span>
            </span>
            <span class="text-[9px] text-[var(--faint)] bg-[var(--panel)] px-1 rounded ml-1 border border-[var(--line)] shrink-0">${groupFiles.length}</span>
          </button>
          <div class="type-group-children ${isCollapsed ? 'hidden' : ''} space-y-0.5">
            ${groupFiles.map((f) => {
              const isAct = (activePath && (activePath === f.path || activePath === f.name));
              const dirPart = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';
              return `
                <button class="project-file-item w-full pl-6 pr-2 py-1 rounded flex items-center justify-between text-left hover:bg-[var(--panel-hi)] transition ${isAct ? 'bg-[var(--panel-hi)] border border-[color-mix(in_srgb,var(--forge)_60%,transparent)] text-[var(--ink)] font-bold' : 'text-[var(--dim)]'}" data-path="${f.path}" title="${f.path}">
                  <span class="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    <span class="truncate text-xs">${f.name}</span>
                    ${dirPart ? `<span class="text-[10px] text-[var(--faint)] truncate">(${dirPart})</span>` : ''}
                  </span>
                  <span class="text-[9px] uppercase px-1 py-0.2 border rounded ml-1 shrink-0 ${group.badge}">${f.kind}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    return out;
  }

  function renderProjectFiles(project: ProjectFolder | null) {
    if (!project) return;
    const allFiles = project.getFilesList();
    if (allFiles.length === 0) {
      projectFileList.innerHTML = `<div class="p-3 text-center text-[var(--dim)] text-xs">No supported files found.</div>`;
      if (projectFileCount) projectFileCount.textContent = '0 files';
      return;
    }

    const activePath = fileManager.getState().projectPath || fileManager.getFilename();
    const tree = buildFileTree(allFiles);

    const q = projectSearchQuery.toLowerCase();
    const matchingCount = q
      ? allFiles.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)).length
      : allFiles.length;

    if (projectFileCount) {
      projectFileCount.textContent = q ? `${matchingCount} / ${allFiles.length}` : `${allFiles.length} files`;
    }

    if (projectTreeMode === 'tree') {
      const filteredTree = filterTree(tree, projectSearchQuery);
      if (filteredTree.length === 0) {
        projectFileList.innerHTML = `<div class="p-3 text-center text-[var(--dim)] text-xs">No files matching "${projectSearchQuery}".</div>`;
      } else {
        projectFileList.innerHTML = renderTreeHtml(filteredTree, 0, activePath);
      }
    } else {
      const groupedHtml = renderGroupedHtml(allFiles, activePath);
      if (!groupedHtml) {
        projectFileList.innerHTML = `<div class="p-3 text-center text-[var(--dim)] text-xs">No files matching "${projectSearchQuery}".</div>`;
      } else {
        projectFileList.innerHTML = groupedHtml;
      }
    }

    // Attach File Click Listeners
    projectFileList.querySelectorAll('.project-file-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        const path = (e.currentTarget as HTMLElement).getAttribute('data-path');
        if (!path) return;
        const currentCode = codePane.getValue();
        const content = await fileManager.openProjectFile(path, currentCode);
        if (content !== null) {
          codePane.setValue(content);
          const resolved = await fileManager.resolvePreview(content);
          previewPane.render(resolved);
          coordinator.updateStats();
          checkDocumentIntegrity(content);
          renderProjectFiles(project);
          showToast(`✦ Opened ${path}`);
        }
      });
    });

    // Attach Folder Toggle Listeners
    projectFileList.querySelectorAll('.tree-folder-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const folderPath = (e.currentTarget as HTMLElement).getAttribute('data-folder-path');
        if (folderPath) {
          if (collapsedFolders.has(folderPath)) {
            collapsedFolders.delete(folderPath);
          } else {
            collapsedFolders.add(folderPath);
          }
          renderProjectFiles(project);
        }
      });
    });

    // Attach Type Group Toggle Listeners
    projectFileList.querySelectorAll('.type-group-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const groupKey = (e.currentTarget as HTMLElement).getAttribute('data-group-key');
        if (groupKey) {
          if (collapsedFolders.has(groupKey)) {
            collapsedFolders.delete(groupKey);
          } else {
            collapsedFolders.add(groupKey);
          }
          renderProjectFiles(project);
        }
      });
    });
  }

  // Drawer Search & Mode Toolbar Listeners
  projectSearchInput?.addEventListener('input', () => {
    projectSearchQuery = projectSearchInput.value.trim();
    if (btnClearProjectSearch) {
      if (projectSearchQuery) btnClearProjectSearch.classList.remove('hidden');
      else btnClearProjectSearch.classList.add('hidden');
    }
    const curProj = fileManager.getProject();
    if (curProj) renderProjectFiles(curProj);
  });

  btnClearProjectSearch?.addEventListener('click', () => {
    if (projectSearchInput) projectSearchInput.value = '';
    projectSearchQuery = '';
    btnClearProjectSearch.classList.add('hidden');
    const curProj = fileManager.getProject();
    if (curProj) renderProjectFiles(curProj);
  });

  btnViewTree?.addEventListener('click', () => {
    projectTreeMode = 'tree';
    btnViewTree.className = 'px-2 py-0.5 rounded font-bold transition bg-[var(--panel-mid)] text-[var(--forge)]';
    btnViewType?.classList.remove('bg-[var(--panel-mid)]', 'text-[var(--forge)]', 'font-bold');
    btnViewType?.classList.add('text-[var(--dim)]');
    const curProj = fileManager.getProject();
    if (curProj) renderProjectFiles(curProj);
  });

  btnViewType?.addEventListener('click', () => {
    projectTreeMode = 'type';
    btnViewType.className = 'px-2 py-0.5 rounded font-bold transition bg-[var(--panel-mid)] text-[var(--forge)]';
    btnViewTree?.classList.remove('bg-[var(--panel-mid)]', 'text-[var(--forge)]', 'font-bold');
    btnViewTree?.classList.add('text-[var(--dim)]');
    const curProj = fileManager.getProject();
    if (curProj) renderProjectFiles(curProj);
  });

  btnExpandAll?.addEventListener('click', () => {
    collapsedFolders.clear();
    const curProj = fileManager.getProject();
    if (curProj) renderProjectFiles(curProj);
    showToast('✦ Expanded all folders');
  });

  btnCollapseAll?.addEventListener('click', () => {
    const curProj = fileManager.getProject();
    if (curProj) {
      if (projectTreeMode === 'tree') {
        const allFiles = curProj.getFilesList();
        const tree = buildFileTree(allFiles);
        collectAllFolderPaths(tree, collapsedFolders);
      } else {
        TYPE_GROUPS.forEach(g => collapsedFolders.add(`group_${g.id}`));
      }
      renderProjectFiles(curProj);
      showToast('✦ Collapsed all folders');
    }
  });

  fileManager.subscribeProject((project) => {
    if (!project) {
      projectDrawer.classList.add('hidden');
      return;
    }
    projectDrawer.classList.remove('hidden');
    projectFolderName.textContent = project.name;
    renderProjectFiles(project);
    showToast(`✦ Opened project folder: ${project.name}`);
  });

  btnOpenFolder?.addEventListener('click', async () => {
    const project = await fileManager.openDirectory();
    if (!project) {
      folderInput?.click();
    }
  });

  folderInput?.addEventListener('change', () => {
    if (folderInput.files && folderInput.files.length > 0) {
      fileManager.setProjectFromFiles(folderInput.files);
    }
  });

  btnCloseProject?.addEventListener('click', () => {
    projectDrawer.classList.toggle('hidden');
  });

  // Save File Button
  const saveAction = async (saveAs = false) => {
    const success = await fileManager.saveFile(codePane.getValue(), saveAs);
    if (success) {
      const saveLabel = document.getElementById('save-label');
      if (saveLabel) {
        saveLabel.textContent = 'Saved!';
        setTimeout(() => { saveLabel.textContent = 'Save'; }, 1500);
      }
      showToast('✦ Saved');
      clearDraft();
      rememberFile(fileManager.recentInfo()).then(renderRecent);
    }
  };
  document.getElementById('btn-save')?.addEventListener('click', () => { saveAction(false); });

  // Open File (File menu, Ctrl+O and the Blank Page screen all use this)
  const openFileAction = async () => {
    const content = await fileManager.openFile();
    if (content !== null) {
      codePane.setValue(content);
      const resolved = await fileManager.resolvePreview(content);
      previewPane.render(resolved);
      coordinator.updateStats();
      checkDocumentIntegrity(content);
      updateBlankPage(content);
      showToast(`✦ Opened ${fileManager.getFilename()}`);
      rememberFile(fileManager.recentInfo()).then(renderRecent);
    }
  };

  // Edit links and pictures right in the preview: a small chip appears over the preview
  // when the clicked element is a link (or inside one) or a picture
  const editChip = document.getElementById('element-edit-chip');
  const btnEditLink = document.getElementById('btn-edit-link');
  const btnEditImage = document.getElementById('btn-edit-image');
  const linkOf = (el: HTMLElement | null) => (el && el.isConnected ? el.closest('a') as HTMLAnchorElement | null : null);
  const imageOf = (el: HTMLElement | null) => (el && el.isConnected && el.tagName === 'IMG' ? el as HTMLImageElement : null);
  updateEditChip = () => {
    const el = previewPane.getActiveElement();
    const a = linkOf(el), img = imageOf(el);
    btnEditLink?.classList.toggle('hidden', !a);
    btnEditImage?.classList.toggle('hidden', !img);
    editChip?.classList.toggle('hidden', !a && !img);
  };
  btnEditLink?.addEventListener('click', async () => {
    const a = linkOf(previewPane.getActiveElement());
    if (!a) return;
    const textOnly = a.children.length === 0;
    const href = { label: 'Goes To', value: a.getAttribute('href') || '', placeholder: 'https://example.com', hint: 'A web address, a file like about.html, or #section-id' };
    const text = { label: 'Link Text', value: a.textContent || '', placeholder: 'Read More' };
    const newTab = { label: 'Open in a New Tab', check: true, value: a.getAttribute('target') === '_blank' ? 'yes' : 'no' };
    const fields = textOnly ? [href, text, newTab] : [href, newTab];
    const choice = await showDialog({
      title: 'Edit Link',
      fields,
      actions: [
        { label: 'Remove Link', value: 'remove' },
        { label: 'Cancel', value: 'cancel' },
        { label: 'Save Link', value: 'ok', primary: true },
      ],
    });
    if (choice === 'remove') {
      previewPane.editElement(() => { a.replaceWith(...Array.from(a.childNodes)); });
      updateEditChip();
      showToast('✦ Link removed, text kept');
    } else if (choice === 'ok') {
      previewPane.editElement(() => {
        a.setAttribute('href', href.value.trim());
        if (textOnly && text.value !== a.textContent) a.textContent = text.value;
        if (newTab.value === 'yes') { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
        else if (a.getAttribute('target') === '_blank') { a.removeAttribute('target'); if (a.getAttribute('rel') === 'noopener') a.removeAttribute('rel'); }
      });
      showToast('✦ Link updated');
    }
  });
  btnEditImage?.addEventListener('click', async () => {
    const img = imageOf(previewPane.getActiveElement());
    if (!img) return;
    const src = {
      label: 'Picture', value: img.getAttribute('data-scrypad-src') || img.getAttribute('src') || '', placeholder: 'images/cat.png or https://...',
      hint: 'A file path, a web address, or choose one from your computer to embed it',
      browse: {
        label: 'Choose…',
        pick: () => new Promise<{ value: string; display: string } | null>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.addEventListener('change', async () => {
            const f = input.files?.[0];
            if (!f) { resolve(null); return; }
            try { resolve({ value: await fileToDataUrl(f), display: `Embedded: ${f.name}` }); } catch { resolve(null); }
          });
          input.click();
        }),
      },
    };
    const alt = { label: 'Description (Alt Text)', value: img.getAttribute('alt') || '', placeholder: 'A sleepy cat on a keyboard', hint: 'Read aloud by screen readers, and shown if the picture can\'t load' };
    const choice = await showDialog({
      title: 'Change Picture',
      fields: [src, alt],
      actions: [
        { label: 'Cancel', value: 'cancel' },
        { label: 'Save Picture', value: 'ok', primary: true },
      ],
    });
    if (choice !== 'ok') return;
    previewPane.editElement(() => {
      const was = img.getAttribute('data-scrypad-src') || img.getAttribute('src') || '';
      if (src.value.trim() && src.value.trim() !== was) { img.setAttribute('src', src.value.trim()); img.removeAttribute('data-scrypad-src'); }
      img.setAttribute('alt', alt.value);
    });
    showToast('✦ Picture updated');
  });

  // File › Recent: up to 6 files you opened or saved here, newest first
  const recentBox = document.getElementById('recent-files');
  async function renderRecent() {
    if (!recentBox) return;
    const list = await listRecent();
    recentBox.innerHTML = '';
    if (!list.length) return;
    const label = document.createElement('div');
    label.className = 'menu-label';
    label.textContent = 'Recent';
    recentBox.appendChild(label);
    list.forEach((rec) => {
      const b = document.createElement('button');
      b.className = 'menu-item';
      b.setAttribute('role', 'menuitem');
      b.title = rec.path || rec.name;
      const span = document.createElement('span');
      const icon = lucideIcon(History);
      const nm = document.createElement('span');
      nm.className = 'recent-name';
      nm.textContent = rec.name;
      span.append(icon, nm);
      b.appendChild(span);
      b.addEventListener('click', () => { closeAllMenus(); openRecentAction(rec); });
      recentBox.appendChild(b);
    });
    const clear = document.createElement('button');
    clear.className = 'menu-item menu-item-quiet';
    clear.setAttribute('role', 'menuitem');
    clear.textContent = 'Clear Recent';
    clear.addEventListener('click', async () => { closeAllMenus(); await clearRecent(); renderRecent(); });
    recentBox.appendChild(clear);
  }
  async function openRecentAction(rec: RecentFile) {
    if (fileManager.isDirty()) {
      const ok = await confirmDialog('Open Another File?', '<p>Your changes to <b>' + escapeHtml(fileManager.getFilename()) + '</b> aren\'t saved yet.</p>', 'Open Anyway', 'Keep Editing');
      if (!ok) return;
    }
    try {
      const content = await fileManager.openRecent(rec);
      codePane.setValue(content);
      previewPane.render(await fileManager.resolvePreview(content));
      coordinator.updateStats();
      checkDocumentIntegrity(content);
      showToast(`✦ Opened ${fileManager.getFilename()}`);
      rememberFile(fileManager.recentInfo()).then(renderRecent);
    } catch (err) {
      if (err instanceof Error && err.message === 'permission') return;
      await forgetFile(rec.key);
      renderRecent();
      showDialog({ title: 'ScryPad Can\'t Find That File', bodyHtml: `<p><b>${escapeHtml(rec.name)}</b> may have been moved, renamed or deleted, so it's been taken off the Recent list.</p>` });
    }
  }
  renderRecent();

  // New File: a truly blank page. The Blank Page screen (with Wisp) shows while it's empty
  const newFileAction = async () => {
    if (fileManager.isDirty()) {
      const ok = await confirmDialog('Start a New Page?', '<p>Your changes to <b>' + escapeHtml(fileManager.getFilename()) + '</b> aren\'t saved yet.</p>', 'Start New Page', 'Keep Editing');
      if (!ok) return;
    }
    fileManager.setUntitled();
    codePane.setValue('');
    previewPane.render('');
    coordinator.updateStats();
    checkDocumentIntegrity('');
    updateBlankPage('');
  };

  // Blank Page screen buttons
  document.getElementById('blank-open')?.addEventListener('click', () => { openFileAction(); });
  document.getElementById('blank-start')?.addEventListener('click', () => {
    const starter = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Untitled</title>\n</head>\n<body>\n  \n</body>\n</html>\n';
    codePane.setValue(starter);
    previewPane.render(starter);
    coordinator.updateStats();
    checkDocumentIntegrity(starter);
    updateBlankPage(starter);
    if (phoneQuery.matches) setViewMode('code');
  });
  document.getElementById('blank-tour')?.addEventListener('click', () => { showTour(); });

  // Keyboard shortcut Ctrl+S / Cmd+S
  // Keyboard shortcuts (the Help menu lists them)
  const isDesktopApp = !!window.__TAURI__ || !!window.__TAURI_INTERNALS__;
  if (isDesktopApp) document.querySelectorAll('.kbd-new').forEach((k) => { k.textContent = 'Ctrl+N'; });
  window.addEventListener('keydown', (e) => {
    if (isDialogOpen() || isTourOpen()) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    const inCode = !!(document.activeElement && (document.activeElement as HTMLElement).closest?.('#code-mount'));
    if (k === 's' && e.shiftKey) { e.preventDefault(); saveAction(true); }
    else if (k === 's') { e.preventDefault(); saveAction(false); }
    else if (k === 'o' && !e.shiftKey) { e.preventDefault(); openFileAction(); }
    else if (k === 'n' && (e.altKey || isDesktopApp)) { e.preventDefault(); newFileAction(); }
    else if (k === 'f' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); tidyCode(); }
    else if ((k === 'b' || k === 'i' || k === 'u') && !inCode && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      document.getElementById(k === 'b' ? 'btn-bold' : k === 'i' ? 'btn-italic' : 'btn-underline')?.click();
    }
    else if (k === 'k' && !inCode && !e.shiftKey && !e.altKey) { e.preventDefault(); document.getElementById('btn-insert-link')?.click(); }
  }, true);

  // Visual Edit Toggle
  toggleVisualEdit.addEventListener('change', () => {
    const active = toggleVisualEdit.checked;
    previewPane.setVisualEditMode(active);
    previewModeTag.textContent = active ? 'Click to Edit On' : 'Click to Edit Off';
    document.getElementById('tweak-zone')?.classList.toggle('is-off', !active);
    previewModeTag.className = active ? 'text-[var(--forge)]' : 'text-[var(--dim)]';
  });

  // Quick Format Bar
  document.getElementById('btn-bold')?.addEventListener('click', () => {
    previewPane.applyStyleCommand('bold');
  });
  document.getElementById('btn-italic')?.addEventListener('click', () => {
    previewPane.applyStyleCommand('italic');
  });
  document.getElementById('btn-underline')?.addEventListener('click', () => {
    previewPane.applyStyleCommand('underline');
  });
  // Text Type: paragraph, headings, quote, lists
  const selectBlock = document.getElementById('select-block') as HTMLSelectElement | null;
  selectBlock?.addEventListener('change', () => {
    const v = selectBlock.value;
    if (v === 'ul') previewPane.applyStyleCommand('insertUnorderedList');
    else if (v === 'ol') previewPane.applyStyleCommand('insertOrderedList');
    else if (v) previewPane.applyStyleCommand('formatBlock', `<${v}>`);
    selectBlock.value = '';
  });
  // Link the selected text, or edit the link you're in
  document.getElementById('btn-insert-link')?.addEventListener('click', async () => {
    const doc = previewPane.getDocument();
    const sel = doc?.getSelection();
    const anchorEl = sel?.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode as HTMLElement) : null;
    if (anchorEl?.closest('a')) { btnEditLink?.click(); return; }
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      showToast('✦ Select some text in the preview first, then press Link');
      return;
    }
    const range = sel.getRangeAt(0).cloneRange();
    const href = { label: 'Goes To', value: 'https://', hint: 'A web address, a file like about.html, or #section-id' };
    const newTab = { label: 'Open in a New Tab', check: true, value: 'no' };
    const choice = await showDialog({ title: 'Add a Link', fields: [href, newTab], actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Add Link', value: 'ok', primary: true }] });
    if (choice !== 'ok' || !href.value.trim() || href.value.trim() === 'https://') return;
    previewPane.applyStyleCommand('createLink', href.value.trim(), range);
    if (newTab.value === 'yes') {
      const a = (doc!.getSelection()?.anchorNode as Node | null);
      const link = (a && (a.nodeType === Node.TEXT_NODE ? a.parentElement : a as HTMLElement))?.closest('a');
      if (link) previewPane.editElement(() => { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener'); });
    }
    showToast('✦ Link added');
  });
  // Edit menu: picture, divider, clear formatting (they go where the cursor is in the preview)
  document.getElementById('menu-edit-divider')?.addEventListener('click', () => {
    closeAllMenus();
    // Goes after the block you're in, so it never splits a paragraph or box in two
    const doc = previewPane.getDocument();
    if (!doc) return;
    const sel = doc.getSelection();
    const node = sel?.anchorNode ?? null;
    const el = node ? (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement) : null;
    const block = el?.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div, section, article, header, footer, figure, img, table, ul, ol');
    previewPane.editElement(() => {
      const hr = doc.createElement('hr');
      if (block && block !== doc.body && doc.body.contains(block)) block.after(hr);
      else doc.body.appendChild(hr);
    });
    showToast('✦ Divider line added');
  });
  document.getElementById('menu-edit-clear-format')?.addEventListener('click', () => {
    closeAllMenus();
    previewPane.applyStyleCommand('removeFormat');
  });
  document.getElementById('menu-edit-picture')?.addEventListener('click', async () => {
    closeAllMenus();
    const doc = previewPane.getDocument();
    const sel = doc?.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const src = {
      label: 'Picture', value: '', placeholder: 'images/cat.png or https://...',
      hint: 'A file path, a web address, or choose one from your computer to embed it',
      browse: {
        label: 'Choose…',
        pick: () => new Promise<{ value: string; display: string } | null>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.addEventListener('change', async () => {
            const f = input.files?.[0];
            if (!f) { resolve(null); return; }
            try { resolve({ value: await fileToDataUrl(f), display: `Embedded: ${f.name}` }); } catch { resolve(null); }
          });
          input.click();
        }),
      },
    };
    const alt = { label: 'Description (Alt Text)', value: '', placeholder: 'A sleepy cat on a keyboard', hint: 'Read aloud by screen readers, and shown if the picture can\'t load' };
    const choice = await showDialog({ title: 'Add a Picture', fields: [src, alt], actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Add Picture', value: 'ok', primary: true }] });
    if (choice !== 'ok' || !src.value.trim() || !doc) return;
    previewPane.editElement(() => {
      const img = doc.createElement('img');
      img.setAttribute('src', src.value.trim());
      img.setAttribute('alt', alt.value);
      img.style.maxWidth = '100%';
      if (range && doc.body.contains(range.startContainer)) { range.collapse(false); range.insertNode(img); }
      else doc.body.appendChild(img);
    });
    showToast('✦ Picture added');
  });

  quickColor.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    previewPane.applyStyleCommand('foreColor', val);
  });

  // Clean Code / Beautify
  const tidyCode = () => {
    codePane.formatHtml();
    previewPane.render(codePane.getValue());
    coordinator.updateStats();
    showToast('✦ Code tidied');
  };

  // Feature: Copy Clean Body
  // --- Export & Publish (GitHub Pages, Site Zip, One HTML File) ---
  const exportDeps = { fileManager, getCode: () => codePane.getValue(), showToast: (m: string) => showToast(m) };
  document.getElementById('menu-export-github')?.addEventListener('click', () => { closeAllMenus(); openExportModal(exportDeps, 'github'); });
  document.getElementById('menu-export-zip')?.addEventListener('click', () => { closeAllMenus(); openExportModal(exportDeps, 'zip'); });
  document.getElementById('menu-export-onefile')?.addEventListener('click', () => { closeAllMenus(); openExportModal(exportDeps, 'single'); });

  document.getElementById('btn-copy-body')?.addEventListener('click', async () => {
    const rawHtml = codePane.getValue();
    const cleanBody = extractCleanBody(rawHtml);
    closeAllMenus();
    await copyOrShow(cleanBody, 'Clean Body', () => showToast('✦ Copied the clean <body> HTML'));
  });

  // Feature: Theme Simulator (Auto -> Dark -> Light -> Auto)
  btnThemeSim.addEventListener('click', () => {
    const current = previewPane.getThemeSimulation();
    let next: 'auto' | 'dark' | 'light' = 'auto';
    if (current === 'auto') next = 'dark';
    else if (current === 'dark') next = 'light';
    else next = 'auto';

    previewPane.setThemeSimulation(next);
    themeSimLabel.textContent = next.charAt(0).toUpperCase() + next.slice(1);
    showToast(next === 'auto' ? '✦ Preview follows your system theme' : `✦ Previewing your page in ${next} mode`);
  });


  // Feature: Visual Style Drawer (CSS Quick-Sliders)
  btnToggleStyles.addEventListener('click', () => {
    styleDrawer.classList.toggle('hidden');
  });

  btnCloseStyleDrawer.addEventListener('click', () => {
    styleDrawer.classList.add('hidden');
  });

  function parsePxValue(valStr: string, defaultNum = 0): number {
    const match = valStr.match(/(-?[\d.]+)px/i);
    return match ? parseFloat(match[1]) : defaultNum;
  }

  function rgbToHex(rgbStr: string): string {
    const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return '#ffffff';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // --- Styles drawer: Font, Weight, Line Height, Align, Width, Border, Shadow ---
  const selectFont = document.getElementById('select-font') as HTMLSelectElement;
  const selectWeight = document.getElementById('select-weight') as HTMLSelectElement;
  const selectAlign = document.getElementById('select-align') as HTMLSelectElement;
  const sliderLineHeight = document.getElementById('slider-line-height') as HTMLInputElement;
  const valLineHeight = document.getElementById('val-line-height')!;
  const sliderWidth = document.getElementById('slider-width') as HTMLInputElement;
  const valWidth = document.getElementById('val-width')!;
  const sliderBorder = document.getElementById('slider-border') as HTMLInputElement;
  const valBorder = document.getElementById('val-border')!;
  const selectBorderStyle = document.getElementById('select-border-style') as HTMLSelectElement;
  const pickerBorderColor = document.getElementById('picker-border-color') as HTMLInputElement;
  const valBorderColor = document.getElementById('val-border-color')!;
  const selectShadow = document.getElementById('select-shadow') as HTMLSelectElement;

  const GOOGLE_FONT_QUERY: Record<string, string> = {
    'VT323': 'VT323', 'Pixelify Sans': 'Pixelify+Sans:wght@400;700', 'Caveat': 'Caveat:wght@400;700', 'Comfortaa': 'Comfortaa:wght@400;700',
  };
  const fontQuery = (name: string) => POPULAR_GOOGLE_FONTS[name] || GOOGLE_FONT_QUERY[name] || name.replace(/ /g, '+');

  function populateExtraStyles(info: ActiveElementInfo) {
    const st = info.styles;
    const fam = (st.fontFamily || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    const opt = Array.from(selectFont.options).find((o) => o.value && (o.value === `gf:${fam}` || o.value.split(',')[0].trim() === fam));
    selectFont.value = opt ? opt.value : (fam ? '__own' : '');
    const w = parseInt(st.fontWeight) || 400;
    selectWeight.value = ['300', '400', '500', '600', '700', '800'].includes(String(w)) ? String(w) : '';
    const fs = parsePxValue(st.fontSize, 16);
    const lh = st.lineHeight === 'normal' || !st.lineHeight ? 1.2 : parsePxValue(st.lineHeight, fs * 1.2) / fs;
    sliderLineHeight.value = String(Math.round(Math.min(3, Math.max(0.8, lh)) * 10));
    valLineHeight.textContent = (Number(sliderLineHeight.value) / 10).toFixed(1);
    selectAlign.value = st.textAlign || '';
    const wPct = /%$/.test(st.width) ? Math.round(parseFloat(st.width)) : 0;
    sliderWidth.value = String(wPct);
    valWidth.textContent = wPct ? `${wPct}%` : (st.width || 'Auto');
    const bw = st.borderStyle === 'none' ? 0 : Math.round(parsePxValue(st.borderWidth, 0));
    sliderBorder.value = String(Math.min(12, bw));
    valBorder.textContent = `${sliderBorder.value}px`;
    if (['solid', 'dashed', 'dotted', 'double'].includes(st.borderStyle)) selectBorderStyle.value = st.borderStyle;
    if (st.borderColor && bw > 0) {
      const hex = st.borderColor.startsWith('#') ? st.borderColor : rgbToHex(st.borderColor);
      pickerBorderColor.value = hex;
      valBorderColor.textContent = hex;
    }
    selectShadow.value = Array.from(selectShadow.options).some((o) => o.value === st.boxShadow) ? st.boxShadow : '';
  }

  selectFont.addEventListener('change', () => {
    const v = selectFont.value;
    if (v === '__own') return;
    if (v.startsWith('gf:')) {
      const name = v.slice(3);
      const doc = previewPane.getDocument();
      if (doc) {
        previewPane.editElement(() => {
          const already = Array.from(doc.querySelectorAll('link[href*="fonts.googleapis.com"]')).some((l) => (l.getAttribute('href') || '').includes(`family=${name.replace(/ /g, '+')}`));
          if (!already) {
            const link = doc.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', `https://fonts.googleapis.com/css2?family=${fontQuery(name)}&display=swap`);
            doc.head.appendChild(link);
          }
        });
      }
      previewPane.updateActiveElementStyle('fontFamily', `'${name}', ${/Mono|Code|VT323/.test(name) ? 'monospace' : /Lora|Playfair|Merriweather|Cinzel/.test(name) ? 'serif' : /Caveat/.test(name) ? 'cursive' : 'sans-serif'}`);
    } else {
      previewPane.updateActiveElementStyle('fontFamily', v);
    }
  });
  selectWeight.addEventListener('change', () => previewPane.updateActiveElementStyle('fontWeight', selectWeight.value));
  selectAlign.addEventListener('change', () => previewPane.updateActiveElementStyle('textAlign', selectAlign.value));
  sliderLineHeight.addEventListener('input', () => {
    const v = (Number(sliderLineHeight.value) / 10).toFixed(1);
    valLineHeight.textContent = v;
    previewPane.updateActiveElementStyle('lineHeight', v);
  });
  sliderWidth.addEventListener('input', () => {
    const v = Number(sliderWidth.value);
    valWidth.textContent = v ? `${v}%` : 'Auto';
    previewPane.updateActiveElementStyle('width', v ? `${v}%` : '');
  });
  const applyBorder = () => {
    const w = Number(sliderBorder.value);
    valBorder.textContent = `${w}px`;
    previewPane.updateActiveElementStyle('border', w ? `${w}px ${selectBorderStyle.value} ${pickerBorderColor.value}` : '');
  };
  sliderBorder.addEventListener('input', applyBorder);
  selectBorderStyle.addEventListener('change', () => { if (Number(sliderBorder.value) === 0) sliderBorder.value = '2'; applyBorder(); });
  pickerBorderColor.addEventListener('input', () => { valBorderColor.textContent = pickerBorderColor.value; if (Number(sliderBorder.value) === 0) sliderBorder.value = '2'; applyBorder(); });
  selectShadow.addEventListener('change', () => previewPane.updateActiveElementStyle('boxShadow', selectShadow.value));

  function populateStyleDrawer(info: ActiveElementInfo) {
    drawerElementTag.textContent = `<${info.tagName}${info.id ? '#' + info.id : ''}${info.className ? '.' + info.className.trim().split(/\s+/)[0] : ''}>`;

    // Font size
    const fontSizeNum = Math.round(parsePxValue(info.styles.fontSize, 16));
    sliderFontSize.value = String(Math.min(96, Math.max(10, fontSizeNum)));
    valFontSize.textContent = `${sliderFontSize.value}px`;

    // Padding
    const paddingNum = Math.round(parsePxValue(info.styles.padding, 16));
    sliderPadding.value = String(Math.min(64, Math.max(0, paddingNum)));
    valPadding.textContent = `${sliderPadding.value}px`;

    // Margin
    const marginNum = Math.round(parsePxValue(info.styles.margin, 0));
    sliderMargin.value = String(Math.min(64, Math.max(0, marginNum)));
    valMargin.textContent = `${sliderMargin.value}px`;

    // Radius
    const radiusNum = Math.round(parsePxValue(info.styles.borderRadius, 0));
    sliderRadius.value = String(Math.min(48, Math.max(0, radiusNum)));
    valRadius.textContent = `${sliderRadius.value}px`;

    // Spacing
    const spacingNum = Math.round(parsePxValue(info.styles.letterSpacing, 0));
    sliderSpacing.value = String(Math.min(10, Math.max(-2, spacingNum)));
    valSpacing.textContent = `${sliderSpacing.value}px`;

    // Opacity
    const opacityNum = Math.round(parseFloat(info.styles.opacity || '1') * 100);
    sliderOpacity.value = String(Math.min(100, Math.max(10, opacityNum)));
    valOpacity.textContent = `${sliderOpacity.value}%`;

    // Colors
    if (info.styles.color) {
      const hex = info.styles.color.startsWith('#') ? info.styles.color : rgbToHex(info.styles.color);
      pickerTextColor.value = hex;
      valTextColor.textContent = hex;
    }
    if (info.styles.backgroundColor && !info.styles.backgroundColor.includes('rgba(0, 0, 0, 0)')) {
      const hex = info.styles.backgroundColor.startsWith('#') ? info.styles.backgroundColor : rgbToHex(info.styles.backgroundColor);
      pickerBgColor.value = hex;
      valBgColor.textContent = hex;
    }

    populateExtraStyles(info);

    // Element Shape Detection
    const valShapeName = document.getElementById('val-shape-name');
    const sliderCutDepth = document.getElementById('slider-cut-depth') as HTMLInputElement;
    const valCutDepth = document.getElementById('val-cut-depth');
    const sliderShapeRadius = document.getElementById('slider-shape-radius') as HTMLInputElement;
    const valShapeRadius = document.getElementById('val-shape-radius');

    currentShapeRadius = radiusNum;
    if (sliderShapeRadius) sliderShapeRadius.value = String(radiusNum);
    if (valShapeRadius) valShapeRadius.textContent = `${radiusNum}px`;

    const cp = info.styles.clipPath || '';
    const cutMatch = cp.match(/(?:calc\(100%\s*-\s*|polygon\()(\d+)px/i);
    if (cutMatch) {
      currentCutDepth = parseInt(cutMatch[1]) || 8;
    } else {
      currentCutDepth = (cp && cp !== 'none') ? 8 : 0;
    }
    if (sliderCutDepth) sliderCutDepth.value = String(currentCutDepth);
    if (valCutDepth) valCutDepth.textContent = `${currentCutDepth}px`;

    if (valShapeName) {
      if (cp.includes('calc(100% -') && cp.includes(', 0 calc(')) {
        valShapeName.textContent = 'Slanted';
        currentElementShape = 'slanted';
      } else if (cp.includes('calc(100% -') && cp.includes(', 0 ')) {
        valShapeName.textContent = 'Notched';
        currentElementShape = 'notched';
      } else if (radiusNum > 0) {
        valShapeName.textContent = 'Round';
        currentElementShape = 'round';
      } else {
        valShapeName.textContent = 'Sharp';
        currentElementShape = 'sharp';
      }
    }
  }

  // Wire Style Drawer Slider Inputs
  sliderFontSize.addEventListener('input', () => {
    valFontSize.textContent = `${sliderFontSize.value}px`;
    previewPane.updateActiveElementStyle('fontSize', `${sliderFontSize.value}px`);
  });

  sliderPadding.addEventListener('input', () => {
    valPadding.textContent = `${sliderPadding.value}px`;
    previewPane.updateActiveElementStyle('padding', `${sliderPadding.value}px`);
  });

  sliderMargin.addEventListener('input', () => {
    valMargin.textContent = `${sliderMargin.value}px`;
    previewPane.updateActiveElementStyle('margin', `${sliderMargin.value}px`);
  });

  sliderRadius.addEventListener('input', () => {
    valRadius.textContent = `${sliderRadius.value}px`;
    currentShapeRadius = parseInt(sliderRadius.value) || 0;
    const sliderShapeRad = document.getElementById('slider-shape-radius') as HTMLInputElement;
    const valShapeRad = document.getElementById('val-shape-radius');
    if (sliderShapeRad) sliderShapeRad.value = sliderRadius.value;
    if (valShapeRad) valShapeRad.textContent = `${sliderRadius.value}px`;
    previewPane.updateActiveElementStyle('borderRadius', `${sliderRadius.value}px`);
  });

  sliderSpacing.addEventListener('input', () => {
    valSpacing.textContent = `${sliderSpacing.value}px`;
    previewPane.updateActiveElementStyle('letterSpacing', `${sliderSpacing.value}px`);
  });

  sliderOpacity.addEventListener('input', () => {
    valOpacity.textContent = `${sliderOpacity.value}%`;
    const opacityDec = (parseInt(sliderOpacity.value) / 100).toFixed(2);
    previewPane.updateActiveElementStyle('opacity', opacityDec);
  });

  pickerTextColor.addEventListener('input', () => {
    valTextColor.textContent = pickerTextColor.value;
    previewPane.updateActiveElementStyle('color', pickerTextColor.value);
  });

  pickerBgColor.addEventListener('input', () => {
    valBgColor.textContent = pickerBgColor.value;
    previewPane.updateActiveElementStyle('backgroundColor', pickerBgColor.value);
  });

  // Element Shape Controls (Style Drawer)
  const valShapeName = document.getElementById('val-shape-name');
  const btnShapeElDefault = document.getElementById('btn-shape-el-default');
  const btnShapeElSlant = document.getElementById('btn-shape-el-slant');
  const btnShapeElNotch = document.getElementById('btn-shape-el-notch');
  const btnShapeElSharp = document.getElementById('btn-shape-el-sharp');
  const btnCopyShapeCss = document.getElementById('btn-copy-shape-css');
  const sliderCutDepth = document.getElementById('slider-cut-depth') as HTMLInputElement;
  const valCutDepth = document.getElementById('val-cut-depth');
  const sliderShapeRadius = document.getElementById('slider-shape-radius') as HTMLInputElement;
  const valShapeRadius = document.getElementById('val-shape-radius');

  let currentElementShape: 'round' | 'slanted' | 'notched' | 'sharp' = 'round';
  let currentCutDepth = 8;
  let currentShapeRadius = 8;

  function buildClipPath(shape: string, depth: number): string {
    if (shape === 'slanted' && depth > 0) {
      return `polygon(0 0, calc(100% - ${depth}px) 0, 100% ${depth}px, 100% 100%, ${depth}px 100%, 0 calc(100% - ${depth}px))`;
    }
    if (shape === 'notched' && depth > 0) {
      return `polygon(${depth}px 0, calc(100% - ${depth}px) 0, 100% ${depth}px, 100% calc(100% - ${depth}px), calc(100% - ${depth}px) 100%, ${depth}px 100%, 0 calc(100% - ${depth}px), 0 ${depth}px)`;
    }
    return 'none';
  }

  function applyShapeToElement() {
    const cp = buildClipPath(currentElementShape, currentCutDepth);
    const rad = `${currentShapeRadius}px`;

    previewPane.updateActiveElementStyle('clipPath', cp === 'none' ? '' : cp);
    previewPane.updateActiveElementStyle('borderRadius', rad);

    if (sliderRadius) sliderRadius.value = String(currentShapeRadius);
    if (valRadius) valRadius.textContent = rad;
  }

  function setElementShapePreset(shapeKey: 'round' | 'slanted' | 'notched' | 'sharp') {
    currentElementShape = shapeKey;
    if (valShapeName) {
      valShapeName.textContent = shapeKey.charAt(0).toUpperCase() + shapeKey.slice(1);
    }
    if (shapeKey === 'slanted') {
      currentCutDepth = 8;
      currentShapeRadius = 0;
    } else if (shapeKey === 'notched') {
      currentCutDepth = 6;
      currentShapeRadius = 0;
    } else if (shapeKey === 'round') {
      currentCutDepth = 0;
      currentShapeRadius = 8;
    } else {
      currentCutDepth = 0;
      currentShapeRadius = 0;
    }

    if (sliderCutDepth) sliderCutDepth.value = String(currentCutDepth);
    if (valCutDepth) valCutDepth.textContent = `${currentCutDepth}px`;
    if (sliderShapeRadius) sliderShapeRadius.value = String(currentShapeRadius);
    if (valShapeRadius) valShapeRadius.textContent = `${currentShapeRadius}px`;

    applyShapeToElement();
    showToast(`✦ Applied ${shapeKey.toUpperCase()} shape preset`);
  }

  btnShapeElDefault?.addEventListener('click', () => setElementShapePreset('round'));
  btnShapeElSlant?.addEventListener('click', () => setElementShapePreset('slanted'));
  btnShapeElNotch?.addEventListener('click', () => setElementShapePreset('notched'));
  btnShapeElSharp?.addEventListener('click', () => setElementShapePreset('sharp'));

  sliderCutDepth?.addEventListener('input', () => {
    currentCutDepth = parseInt(sliderCutDepth.value) || 0;
    if (valCutDepth) valCutDepth.textContent = `${currentCutDepth}px`;
    if (currentElementShape === 'round' || currentElementShape === 'sharp') {
      currentElementShape = 'slanted';
      if (valShapeName) valShapeName.textContent = 'Slanted';
    }
    applyShapeToElement();
  });

  sliderShapeRadius?.addEventListener('input', () => {
    currentShapeRadius = parseInt(sliderShapeRadius.value) || 0;
    if (valShapeRadius) valShapeRadius.textContent = `${currentShapeRadius}px`;
    applyShapeToElement();
  });

  btnCopyShapeCss?.addEventListener('click', async () => {
    const el = previewPane.getActiveElement();
    const cp = buildClipPath(currentElementShape, currentCutDepth);
    let snippet = `/* Button / Card Shape CSS (${currentElementShape.toUpperCase()}) */\n`;
    if (cp !== 'none') {
      snippet += `clip-path: ${cp};\n`;
    } else {
      snippet += `clip-path: none;\n`;
    }
    snippet += `border-radius: ${currentShapeRadius}px;\n`;
    if (el) {
      if (el.style.backgroundColor) snippet += `background-color: ${el.style.backgroundColor};\n`;
      if (el.style.color) snippet += `color: ${el.style.color};\n`;
      if (el.style.padding) snippet += `padding: ${el.style.padding};\n`;
    } else {
      snippet += `padding: 10px 22px;\nbackground: #c56bff;\ncolor: #0f0b16;\nfont-weight: 700;\ncursor: pointer;\n`;
    }
    await copyOrShow(snippet, 'Shape CSS', () => showToast('✦ Copied the shape CSS'));
  });

  // Feature: Global Palette Swatches & Replace Modal
  const modalPalette = document.getElementById('modal-palette')!;
  const btnPaletteToggle = document.getElementById('btn-palette-toggle')!;
  const btnClosePalette = document.getElementById('btn-close-palette')!;
  const btnPaletteDone = document.getElementById('btn-palette-done')!;
  const paletteSwatches = document.getElementById('palette-swatches')!;
  const replaceTargetLabel = document.getElementById('replace-target-label')!;
  const replaceNewColorPicker = document.getElementById('replace-new-color-picker') as HTMLInputElement;
  const replaceNewColorText = document.getElementById('replace-new-color-text') as HTMLInputElement;
  const btnReplaceColorAll = document.getElementById('btn-replace-color-all')!;
  const btnCopyColor = document.getElementById('btn-copy-color')!;
  const paletteSummaryCount = document.getElementById('palette-summary-count')!;

  let activeTargetColor: string | null = null;

  function renderPalette() {
    const code = codePane.getValue();
    const swatches: ColorSwatch[] = extractPalette(code);
    paletteSummaryCount.textContent = `${swatches.length} unique colors detected`;

    if (swatches.length === 0) {
      paletteSwatches.innerHTML = `<div class="col-span-full py-6 text-center text-xs text-[var(--dim)]">No colors detected in document styles.</div>`;
      return;
    }

    paletteSwatches.innerHTML = swatches.map((s) => `
      <button class="swatch-card p-2 bg-[var(--panel-hi)] hover:bg-[var(--panel-hover)] border ${activeTargetColor === s.color ? 'border-[var(--forge-hi)]' : 'border-[var(--line)]'} rounded flex items-center gap-2.5 transition text-left" data-color="${s.color}">
        <span class="w-6 h-6 rounded shadow border border-white/20 shrink-0" style="background-color: ${s.color};"></span>
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-['Fira_Code'] text-[var(--ink)] font-bold truncate">${s.color}</div>
          <div class="text-[10px] text-[var(--dim)]">${s.count} ${s.count === 1 ? 'match' : 'matches'}</div>
        </div>
      </button>
    `).join('');

    paletteSwatches.querySelectorAll('.swatch-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const color = (e.currentTarget as HTMLElement).getAttribute('data-color');
        if (!color) return;
        activeTargetColor = color;
        replaceTargetLabel.textContent = color;
        btnCopyColor.classList.remove('hidden');

        // If hex, set to picker
        if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
          const hex7 = color.length === 4 
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` 
            : color;
          replaceNewColorPicker.value = hex7;
          replaceNewColorText.value = hex7;
        } else {
          replaceNewColorText.value = color;
        }

        renderPalette();
      });
    });
  }

  btnPaletteToggle.addEventListener('click', () => {
    renderPalette();
    modalPalette.classList.remove('hidden');
  });

  btnClosePalette.addEventListener('click', () => {
    modalPalette.classList.add('hidden');
  });

  btnPaletteDone.addEventListener('click', () => {
    modalPalette.classList.add('hidden');
  });

  modalPalette.addEventListener('click', (e) => {
    if (e.target === modalPalette) modalPalette.classList.add('hidden');
  });

  replaceNewColorPicker.addEventListener('input', () => {
    replaceNewColorText.value = replaceNewColorPicker.value;
  });

  replaceNewColorText.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(replaceNewColorText.value)) {
      replaceNewColorPicker.value = replaceNewColorText.value;
    }
  });

  btnCopyColor.addEventListener('click', async () => {
    if (!activeTargetColor) return;
    await navigator.clipboard.writeText(activeTargetColor);
    showToast(`✦ Copied color ${activeTargetColor}`);
  });

  btnReplaceColorAll.addEventListener('click', () => {
    if (!activeTargetColor) {
      showToast('✦ Pick a color swatch first');
      return;
    }
    const newColor = replaceNewColorText.value.trim();
    if (!newColor) return;

    const currentCode = codePane.getValue();
    const updatedCode = replaceColor(currentCode, activeTargetColor, newColor);
    codePane.setValue(updatedCode);
    previewPane.render(updatedCode);
    coordinator.updateStats();
    fileManager.markDirty(true);
    showToast(`✦ Replaced ${activeTargetColor} with ${newColor}`);
    activeTargetColor = newColor;
    replaceTargetLabel.textContent = newColor;
    renderPalette();
  });

  // Responsive Viewports
  const viewportBtns = document.querySelectorAll('.viewport-btn');
  viewportBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const width = btn.getAttribute('data-width') || '100%';
      viewportBtns.forEach((b) => b.classList.toggle('is-on', b === btn));
      document.querySelectorAll('.menu-vp').forEach((m) => m.classList.toggle('is-on', m.getAttribute('data-width') === width));
      previewPane.setViewportWidth(width);
    });
  });

  document.querySelectorAll('.menu-vp').forEach((m) => {
    m.addEventListener('click', () => {
      closeAllMenus();
      const w = m.getAttribute('data-width');
      (document.querySelector(`.viewport-btn[data-width="${w}"]`) as HTMLElement | null)?.click();
    });
  });

  // View Modes (Split / Code / Preview) & Resizable Gutter
  const codePaneContainer = document.getElementById('code-pane-container')!;
  const previewPaneContainer = document.getElementById('preview-pane-container')!;
  const paneResizer = document.getElementById('pane-resizer')!;
  let splitRatio = 50;
  let isDraggingResizer = false;

  paneResizer.addEventListener('pointerdown', (e) => {
    isDraggingResizer = true;
    paneResizer.setPointerCapture(e.pointerId);
    document.body.classList.add('select-none');
    const previewIframe = previewMount.querySelector('iframe');
    if (previewIframe) previewIframe.style.pointerEvents = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingResizer) return;
    const workspace = document.getElementById('workspace')!;
    const rect = workspace.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(15, Math.min(85, (x / rect.width) * 100));
    splitRatio = pct;
    codePaneContainer.style.width = `${pct}%`;
    previewPaneContainer.style.width = `${100 - pct}%`;
  });

  const stopResizerDrag = (e: PointerEvent) => {
    if (!isDraggingResizer) return;
    isDraggingResizer = false;
    try { paneResizer.releasePointerCapture(e.pointerId); } catch {}
    document.body.classList.remove('select-none');
    const previewIframe = previewMount.querySelector('iframe');
    if (previewIframe) previewIframe.style.pointerEvents = 'auto';
  };

  window.addEventListener('pointerup', stopResizerDrag);
  window.addEventListener('pointercancel', stopResizerDrag);

  // Double click resets to 50/50
  paneResizer.addEventListener('dblclick', () => {
    splitRatio = 50;
    codePaneContainer.style.width = '50%';
    previewPaneContainer.style.width = '50%';
    showToast('✦ Split layout reset to 50 / 50');
  });

  const modeButtons = {
    split: document.getElementById('mode-split')!,
    code: document.getElementById('mode-code')!,
    preview: document.getElementById('mode-preview')!
  };

  let currentViewMode: 'split' | 'code' | 'preview' = 'split';
  const phoneTabs = {
    code: document.getElementById('phone-tab-code'),
    preview: document.getElementById('phone-tab-preview')
  };

  function setViewMode(mode: 'split' | 'code' | 'preview') {
    // No room for a split on a phone: show the page itself
    if (mode === 'split' && phoneQuery.matches) mode = 'preview';
    currentViewMode = mode;
    Object.entries(phoneTabs).forEach(([m, tab]) => {
      if (!tab) return;
      tab.classList.toggle('is-active', m === mode);
      tab.setAttribute('aria-selected', String(m === mode));
    });
    Object.entries(modeButtons).forEach(([m, btn]) => {
      btn.classList.toggle('is-on', m === mode);
    });
    ['split', 'code', 'preview'].forEach((m) => document.getElementById(`menu-view-${m}`)?.classList.toggle('is-on', m === mode));

    if (mode === 'split') {
      codePaneContainer.style.display = 'flex';
      codePaneContainer.style.width = `${splitRatio}%`;
      previewPaneContainer.style.display = 'flex';
      previewPaneContainer.style.width = `${100 - splitRatio}%`;
      paneResizer.style.display = 'flex';
    } else if (mode === 'code') {
      codePaneContainer.style.display = 'flex';
      codePaneContainer.style.width = '100%';
      previewPaneContainer.style.display = 'none';
      paneResizer.style.display = 'none';
    } else {
      codePaneContainer.style.display = 'none';
      previewPaneContainer.style.display = 'flex';
      previewPaneContainer.style.width = '100%';
      paneResizer.style.display = 'none';
    }
  }

  modeButtons.split.addEventListener('click', () => setViewMode('split'));
  modeButtons.code.addEventListener('click', () => setViewMode('code'));
  modeButtons.preview.addEventListener('click', () => setViewMode('preview'));
  phoneTabs.code?.addEventListener('click', () => setViewMode('code'));
  phoneTabs.preview?.addEventListener('click', () => setViewMode('preview'));
  const syncPhoneLayout = () => {
    if (phoneQuery.matches && currentViewMode === 'split') setViewMode('preview');
    else if (!phoneQuery.matches && currentViewMode !== 'split') setViewMode('split');
  };
  phoneQuery.addEventListener('change', syncPhoneLayout);
  syncPhoneLayout();

  // CDN Library Injector Modal
  const modalLibrary = document.getElementById('modal-library')!;
  const libraryList = document.getElementById('library-list')!;
  const btnCloseModal = document.getElementById('btn-close-modal')!;
  const btnModalDone = document.getElementById('btn-modal-done')!;

  // Render library list
  libraryList.innerHTML = CDN_LIBRARIES.map((lib) => `
    <div class="hud-frame p-3 rounded flex items-center justify-between gap-3 hover:border-[var(--forge)] transition">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="font-['Chakra_Petch'] font-bold text-[var(--ink)] text-sm tracking-wide">${lib.name}</span>
          <span class="text-[10px] font-['Fira_Code'] uppercase px-1.5 py-0.2 bg-[var(--panel-hi)] text-[var(--forge)] border border-[var(--line)] rounded">${lib.badge}</span>
        </div>
        <p class="text-xs text-[var(--dim)] mt-0.5">${lib.description}</p>
      </div>
      <button class="btn-hud btn-hud-ghost btn-inject text-xs whitespace-nowrap" data-lib-id="${lib.id}">
        <span>+ Add</span>
      </button>
    </div>
  `).join('');

  // Wire inject buttons
  libraryList.querySelectorAll('.btn-inject').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const libId = target.getAttribute('data-lib-id');
      const lib = CDN_LIBRARIES.find((l) => l.id === libId);
      if (lib) {
        const currentCode = codePane.getValue();
        const updatedCode = injectSnippetIntoHtml(currentCode, lib.snippet);
        codePane.setValue(updatedCode);
        previewPane.render(updatedCode);
        coordinator.updateStats();

        target.innerHTML = '<span>✦ Added!</span>';
        target.classList.remove('btn-hud-ghost');
        target.classList.add('btn-hud-primary');
        setTimeout(() => {
          target.innerHTML = '<span>+ Add</span>';
          target.classList.remove('btn-hud-primary');
          target.classList.add('btn-hud-ghost');
        }, 1500);

        showToast(`✦ Added ${lib.name}`);
      }
    });
  });

  btnCloseModal.addEventListener('click', () => {
    modalLibrary.classList.add('hidden');
  });
  btnModalDone.addEventListener('click', () => {
    modalLibrary.classList.add('hidden');
  });
  modalLibrary.addEventListener('click', (e) => {
    if (e.target === modalLibrary) modalLibrary.classList.add('hidden');
  });

  // --- Desktop Menu Bar Dropdowns & Actions ---
  const menuGroups = document.querySelectorAll('.menu-group');
  let activeOpenMenu: HTMLElement | null = null;

  const appHeader = document.getElementById('app-header');
  const btnPhoneMenu = document.getElementById('btn-phone-menu');
  function closeAllMenus() {
    document.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.add('hidden'));
    document.querySelectorAll('.menu-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    activeOpenMenu = null;
    appHeader?.classList.remove('menus-open');
    btnPhoneMenu?.setAttribute('aria-expanded', 'false');
  }
  btnPhoneMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !appHeader?.classList.contains('menus-open');
    closeAllMenus();
    if (opening) {
      appHeader?.classList.add('menus-open');
      btnPhoneMenu.setAttribute('aria-expanded', 'true');
    }
  });
  // Any menu item closes the menus (the item's own handler still runs)
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', () => setTimeout(closeAllMenus, 0));
  });
  document.getElementById('menubar')?.addEventListener('click', (e) => {
    // keep clicks inside an open phone menu from closing it before the item runs
    if (appHeader?.classList.contains('menus-open')) e.stopPropagation();
  });
  // Keyboard: arrow keys move through an open menu, Escape closes it
  document.addEventListener('keydown', (e) => {
    const openDrop = document.querySelector('.menu-dropdown:not(.hidden)') as HTMLElement | null;
    if (!openDrop || window.matchMedia('(max-width: 767px)').matches) return;
    const items = Array.from(openDrop.querySelectorAll<HTMLElement>('.menu-item'));
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Escape') {
      const btn = openDrop.parentElement?.querySelector('.menu-btn') as HTMLElement | null;
      closeAllMenus();
      btn?.focus();
    }
  });

  menuGroups.forEach((group) => {
    const btn = group.querySelector('.menu-btn') as HTMLElement;
    const dropdown = group.querySelector('.menu-dropdown') as HTMLElement;
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdown.classList.contains('hidden');
      closeAllMenus();
      if (isHidden) {
        dropdown.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        activeOpenMenu = group as HTMLElement;
      }
    });

    btn.addEventListener('mouseenter', () => {
      if (activeOpenMenu && activeOpenMenu !== group) {
        closeAllMenus();
        dropdown.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        activeOpenMenu = group as HTMLElement;
      }
    });
  });

  window.addEventListener('click', () => {
    closeAllMenus();
  });

  // File Menu
  document.getElementById('menu-file-new')?.addEventListener('click', () => {
    closeAllMenus();
    newFileAction();
  });
  document.getElementById('menu-file-open')?.addEventListener('click', () => {
    closeAllMenus();
    openFileAction();
  });
  document.getElementById('menu-file-save')?.addEventListener('click', () => {
    closeAllMenus();
    document.getElementById('btn-save')?.click();
  });
  document.getElementById('menu-file-save-as')?.addEventListener('click', () => {
    closeAllMenus();
    saveAction(true);
  });

  // Edit Menu
  document.getElementById('menu-edit-undo')?.addEventListener('click', () => {
    closeAllMenus();
    codePane.undo();
    codePane.focus();
  });
  document.getElementById('menu-edit-redo')?.addEventListener('click', () => {
    closeAllMenus();
    codePane.redo();
    codePane.focus();
  });
  document.getElementById('menu-edit-clean')?.addEventListener('click', () => {
    closeAllMenus();
    tidyCode();
  });

  document.getElementById('menu-tools-libraries')?.addEventListener('click', () => {
    closeAllMenus();
    modalLibrary.classList.remove('hidden');
  });

  // View Menu
  document.getElementById('menu-view-split')?.addEventListener('click', () => {
    closeAllMenus();
    setViewMode('split');
  });
  document.getElementById('menu-view-code')?.addEventListener('click', () => {
    closeAllMenus();
    setViewMode('code');
  });
  document.getElementById('menu-view-preview')?.addEventListener('click', () => {
    closeAllMenus();
    setViewMode('preview');
  });
  document.getElementById('menu-view-popout')?.addEventListener('click', () => {
    closeAllMenus();
    if (!previewPane.openPopOut()) {
      showDialog({
        title: 'Pop Out Was Blocked',
        bodyHtml: '<p>Your browser stopped the new window from opening. Allow pop-ups for ScryPad, then try View › Pop Out Preview again.</p>',
      });
    }
  });

  // --- Find & Search & Replace HUD Bar ---
  const findReplaceBar = document.getElementById('find-replace-bar')!;
  const btnFindToggle = document.getElementById('btn-find-toggle')!;
  const btnCloseFind = document.getElementById('btn-close-find')!;
  const findInput = document.getElementById('find-input') as HTMLInputElement;
  const replaceInput = document.getElementById('replace-input') as HTMLInputElement;
  const findCount = document.getElementById('find-count')!;
  const btnFindPrev = document.getElementById('btn-find-prev')!;
  const btnFindNext = document.getElementById('btn-find-next')!;
  const btnFindCase = document.getElementById('btn-find-case')!;
  const btnReplaceNext = document.getElementById('btn-replace-next')!;
  const btnReplaceAll = document.getElementById('btn-replace-all')!;

  let isCaseSensitive = false;

  function updateSearchMatches() {
    const query = findInput.value;
    const replaceStr = replaceInput.value;
    const { total, current } = codePane.setSearch(query, replaceStr, isCaseSensitive);
    if (!query) {
      findCount.textContent = '0/0';
      findCount.className = 'text-[11px] text-[var(--dim)] px-1 shrink-0 min-w-[36px] text-right';
    } else if (total === 0) {
      findCount.textContent = '0';
      findCount.className = 'text-[11px] text-[var(--gold)] px-1 shrink-0 min-w-[36px] text-right';
    } else {
      findCount.textContent = `${current > 0 ? current : 1}/${total}`;
      findCount.className = 'text-[11px] text-[var(--forge-hi)] px-1 shrink-0 min-w-[36px] text-right';
    }
  }

  function openFindBar(focusReplace = false) {
    findReplaceBar.classList.remove('hidden');
    findReplaceBar.style.display = 'flex';
    btnFindToggle.classList.add('btn-hud-active');
    if (focusReplace) {
      replaceInput.focus();
      replaceInput.select();
    } else {
      findInput.focus();
      findInput.select();
    }
    updateSearchMatches();
  }

  function closeFindBar() {
    findReplaceBar.classList.add('hidden');
    findReplaceBar.style.display = 'none';
    btnFindToggle.classList.remove('btn-hud-active');
    codePane.setSearch('', '');
    codePane.focus();
  }

  if (btnFindToggle) {
    btnFindToggle.addEventListener('click', () => {
      if (findReplaceBar.classList.contains('hidden') || findReplaceBar.style.display === 'none') {
        openFindBar();
      } else {
        closeFindBar();
      }
    });
  }

  if (btnCloseFind) {
    btnCloseFind.addEventListener('click', closeFindBar);
  }

  findInput.addEventListener('input', updateSearchMatches);
  replaceInput.addEventListener('input', updateSearchMatches);

  btnFindNext.addEventListener('click', () => {
    codePane.findNext();
    updateSearchMatches();
  });

  btnFindPrev.addEventListener('click', () => {
    codePane.findPrevious();
    updateSearchMatches();
  });

  btnFindCase.addEventListener('click', () => {
    isCaseSensitive = !isCaseSensitive;
    btnFindCase.className = isCaseSensitive 
      ? "px-2 py-1 bg-[var(--panel-hi)] border border-[var(--forge)] text-[var(--forge)] rounded text-[11px] font-bold shadow-[0_0_8px_rgba(197,107,255,0.3)] transition"
      : "px-2 py-1 bg-[var(--panel-hi)] border border-[var(--line)] rounded text-[11px] font-bold text-[var(--dim)] hover:text-[var(--ink)] transition";
    updateSearchMatches();
  });

  btnReplaceNext.addEventListener('click', () => {
    codePane.replaceNext();
    updateSearchMatches();
  });

  btnReplaceAll.addEventListener('click', () => {
    codePane.replaceAll();
    updateSearchMatches();
    showToast('✦ Replaced all occurrences in document');
  });

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        codePane.findPrevious();
      } else {
        codePane.findNext();
      }
      updateSearchMatches();
    } else if (e.key === 'Escape') {
      closeFindBar();
    }
  });

  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      codePane.replaceNext();
      updateSearchMatches();
    } else if (e.key === 'Escape') {
      closeFindBar();
    }
  });

  // Global hotkeys for search: Ctrl/Cmd+F, Ctrl/Cmd+H
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFindBar(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      openFindBar(true);
    } else if (e.key === 'Escape' && !findReplaceBar.classList.contains('hidden') && findReplaceBar.style.display !== 'none') {
      closeFindBar();
    }
  });

  // --- Educational Tag Guides & Grimoire of Tags ---
  const btnToggleGuides = document.getElementById('btn-toggle-guides')!;
  const labelGuides = document.getElementById('label-guides')!;
  const inspectorTagHint = document.getElementById('inspector-tag-hint')!;
  const hintTagName = document.getElementById('hint-tag-name')!;
  const hintTagDesc = document.getElementById('hint-tag-desc')!;
  const hintTagTitle = document.getElementById('hint-tag-title')!;
  const hintTagMore = document.getElementById('hint-tag-more')!;
  const hintTagDetail = document.getElementById('hint-tag-detail')!;
  const hintTagLong = document.getElementById('hint-tag-long')!;
  const hintTagAttrs = document.getElementById('hint-tag-attrs')!;
  let tagBarOpen = false;
  try { tagBarOpen = localStorage.getItem('scrypad_tagbar') === 'open'; } catch { /* ignore */ }
  const setTagBarOpen = (open: boolean) => {
    tagBarOpen = open;
    hintTagDetail.classList.toggle('hidden', !open);
    hintTagMore.setAttribute('aria-expanded', String(open));
    hintTagMore.classList.toggle('is-on', open);
    const label = hintTagMore.querySelector('span');
    if (label) label.textContent = open ? 'Less' : 'More';
    try { localStorage.setItem('scrypad_tagbar', open ? 'open' : 'closed'); } catch { /* ignore */ }
  };
  setTagBarOpen(tagBarOpen);
  hintTagMore.addEventListener('click', () => setTagBarOpen(!tagBarOpen));

  let guidesEnabled = localStorage.getItem('scrypad_guides') !== 'off';

  function updateGuidesState() {
    if (guidesEnabled) {
      labelGuides.textContent = 'On';
      btnToggleGuides.classList.add('is-on');
    } else {
      labelGuides.textContent = 'Off';
      btnToggleGuides.classList.remove('is-on');
      inspectorTagHint.classList.add('hidden');
      inspectorTagHint.style.display = 'none';
    }
    localStorage.setItem('scrypad_guides', guidesEnabled ? 'on' : 'off');
  }
  updateGuidesState();

  btnToggleGuides.addEventListener('click', () => {
    closeAllMenus();
    guidesEnabled = !guidesEnabled;
    updateGuidesState();
    showToast(guidesEnabled ? '✦ Learning Tips on' : '✦ Learning Tips off');
  });

  // Define updateTagHint for active preview element
  updateTagHint = (tagName: string) => {
    if (!guidesEnabled || !tagName) {
      inspectorTagHint.classList.add('hidden');
      inspectorTagHint.style.display = 'none';
      return;
    }
    const tagInfo = findTagInfo(tagName);
    if (tagInfo) {
      hintTagName.textContent = `<${tagInfo.tag}>`;
      hintTagTitle.textContent = tagInfo.name;
      hintTagDesc.textContent = tagInfo.purpose || '';
      hintTagLong.textContent = tagInfo.description || '';
      hintTagAttrs.innerHTML = '';
      if (tagInfo.commonAttributes?.length) {
        const lbl = document.createElement('span');
        lbl.className = 'tag-bar-attrs-label';
        lbl.textContent = 'Common Attributes';
        hintTagAttrs.appendChild(lbl);
        tagInfo.commonAttributes.forEach((a) => {
          const c = document.createElement('code');
          c.textContent = a;
          hintTagAttrs.appendChild(c);
        });
      }
      inspectorTagHint.classList.remove('hidden');
      inspectorTagHint.style.display = 'block';
    } else {
      inspectorTagHint.classList.add('hidden');
      inspectorTagHint.style.display = 'none';
    }
  };

  // Tag Guide Modal
  const modalTagGuide = document.getElementById('modal-tag-guide')!;
  const btnTagGuideToggle = document.getElementById('btn-tag-guide-toggle')!;
  const btnCloseTagGuide = document.getElementById('btn-close-tag-guide')!;
  const btnTagGuideDone = document.getElementById('btn-tag-guide-done')!;
  const tagGuideSearch = document.getElementById('tag-guide-search') as HTMLInputElement;
  const btnClearTagSearch = document.getElementById('btn-clear-tag-search')!;
  const tagCardsContainer = document.getElementById('tag-cards-container')!;
  const tagGuideCount = document.getElementById('tag-guide-count')!;
  const tagCategoryPills = document.querySelectorAll('.tag-cat-pill');

  let currentTagCategory = 'All';

  function renderTagGuideCards(filterText = '') {
    const q = filterText.toLowerCase().trim();
    const filtered = HTML_TAG_DICTIONARY.filter((t: TagInfo) => {
      const matchesCategory = currentTagCategory === 'All' || t.category === currentTagCategory;
      const matchesSearch = !q || 
        t.tag.toLowerCase().includes(q) || 
        t.name.toLowerCase().includes(q) || 
        t.purpose.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    tagGuideCount.textContent = `Showing ${filtered.length} of ${HTML_TAG_DICTIONARY.length} tags`;

    if (filtered.length === 0) {
      tagCardsContainer.innerHTML = `<div class="p-6 text-center text-[var(--dim)]">No tags matching "${filterText}". Try searching for button, input, select, form, or table.</div>`;
      return;
    }

    tagCardsContainer.innerHTML = filtered.map((t: TagInfo) => `
      <div class="hud-frame p-3.5 rounded-md border border-[var(--line)] bg-[var(--panel)] hover:border-[var(--forge)] transition flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <code class="text-sm font-bold text-[var(--forge)] bg-[var(--panel-hi)] px-2 py-0.5 rounded border border-[var(--line)]">&lt;${t.tag}&gt;</code>
            <span class="text-xs font-semibold text-[var(--ink)]">${t.name}</span>
            <span class="text-[10px] text-[var(--forge-hi)] bg-[color-mix(in_srgb,var(--forge-hi)_10%,transparent)] border border-[color-mix(in_srgb,var(--forge-hi)_30%,transparent)] px-1.5 py-0.2 rounded">${t.purpose}</span>
          </div>
          <button class="btn-hud btn-hud-primary btn-insert-tag text-xs py-0.5 px-2.5" data-tag="${t.tag}">
            <span>+ Insert</span>
          </button>
        </div>
        <p class="text-xs text-[var(--dim)] leading-relaxed">${t.description}</p>
        <div class="flex items-center justify-between pt-1 border-t border-[color-mix(in_srgb,var(--line)_60%,transparent)] text-[11px]">
          <div class="flex items-center gap-1.5 text-[var(--dim)] truncate">
            <span class="text-[10px] uppercase text-[color-mix(in_srgb,var(--dim)_70%,transparent)]">Attributes:</span>
            ${t.commonAttributes.map(a => `<code class="text-[var(--blue)] bg-[var(--void)] px-1 py-0.2 rounded border border-[var(--line)]">${a}</code>`).join(' ')}
          </div>
          <span class="text-[10px] text-[color-mix(in_srgb,var(--forge)_70%,transparent)] uppercase tracking-wider shrink-0">${t.category}</span>
        </div>
      </div>
    `).join('');

    tagCardsContainer.querySelectorAll('.btn-insert-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = (e.currentTarget as HTMLElement).getAttribute('data-tag');
        const item = HTML_TAG_DICTIONARY.find((x: TagInfo) => x.tag === tag);
        if (item) {
          codePane.insertSnippet(item.snippet);
          modalTagGuide.classList.add('hidden');
          showToast(`✦ Inserted <${item.tag}> snippet into editor`);
        }
      });
    });
  }

  function openTagGuide(searchQuery = '') {
    modalTagGuide.classList.remove('hidden');
    tagGuideSearch.value = searchQuery;
    btnClearTagSearch.classList.toggle('hidden', !searchQuery);
    renderTagGuideCards(searchQuery);
    tagGuideSearch.focus();
  }

  btnTagGuideToggle.addEventListener('click', () => openTagGuide(''));
  btnCloseTagGuide.addEventListener('click', () => modalTagGuide.classList.add('hidden'));
  btnTagGuideDone.addEventListener('click', () => modalTagGuide.classList.add('hidden'));
  modalTagGuide.addEventListener('click', (e) => {
    if (e.target === modalTagGuide) modalTagGuide.classList.add('hidden');
  });

  tagGuideSearch.addEventListener('input', () => {
    const val = tagGuideSearch.value;
    btnClearTagSearch.classList.toggle('hidden', !val);
    renderTagGuideCards(val);
  });

  btnClearTagSearch.addEventListener('click', () => {
    tagGuideSearch.value = '';
    btnClearTagSearch.classList.add('hidden');
    renderTagGuideCards('');
    tagGuideSearch.focus();
  });

  tagCategoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tagCategoryPills.forEach(p => {
        p.className = "tag-cat-pill px-2.5 py-1 rounded text-[var(--dim)] hover:bg-[var(--panel-hi)]";
      });
      pill.className = "tag-cat-pill px-2.5 py-1 rounded bg-[var(--panel-hi)] text-[var(--forge)] border border-[var(--line-hot)]";
      currentTagCategory = pill.getAttribute('data-category') || 'All';
      renderTagGuideCards(tagGuideSearch.value);
    });
  });

  document.getElementById('hint-tag-guide')!.addEventListener('click', () => {
    const currentTag = hintTagName.textContent?.replace(/[<>]/g, '') || '';
    openTagGuide(currentTag);
  });

  // --- Godot BBCode Exporter ---
  const btnGodotBbcode = document.getElementById('btn-godot-bbcode');
  if (btnGodotBbcode) {
    btnGodotBbcode.addEventListener('click', async () => {
      const currentHtml = codePane.getValue();
      const bbcode = htmlToGodotBBCode(currentHtml);
      closeAllMenus();
      await copyOrShow(bbcode, 'Godot BBCode', () => showToast('✦ Copied as Godot BBCode'));
    });
  }

  // --- Desktop app: open the .html file ScryPad was launched with ---
  desktopLaunchFile().then(async (f) => {
    if (!f) return;
    const content = fileManager.adoptDesktopFile(f);
    codePane.setValue(content);
    const resolved = await fileManager.resolvePreview(content);
    previewPane.render(resolved);
    coordinator.updateStats();
    checkDocumentIntegrity(content);
    updateBlankPage(content);
    showToast(`✦ Opened ${f.name}`);
  });

  // --- Unsaved work: leave-page warning + a draft kept in this browser ---
  const tauriWindow = window.__TAURI__?.window?.getCurrentWindow?.();
  if (tauriWindow) {
    // Desktop app: ask before closing with unsaved changes
    tauriWindow.onCloseRequested(async (event: { preventDefault: () => void }) => {
      if (!fileManager.isDirty()) return;
      event.preventDefault();
      const choice = await showDialog({
        title: 'Save Before You Go?',
        bodyHtml: '<p>Your changes to <b>' + escapeHtml(fileManager.getFilename()) + '</b> aren\'t saved yet.</p>',
        actions: [
          { label: 'Cancel', value: 'cancel' },
          { label: 'Don\'t Save', value: 'discard' },
          { label: 'Save', value: 'save', primary: true },
        ],
      });
      if (choice === 'cancel') return;
      if (choice === 'save') {
        const ok = await fileManager.saveFile(codePane.getValue());
        if (!ok) return;
      }
      clearDraft();
      await tauriWindow.destroy();
    });
  } else {
    window.addEventListener('beforeunload', (e) => {
      if (fileManager.isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  const DRAFT_KEY = 'scrypad_draft';
  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  codeMount.addEventListener('keyup', () => queueDraft());
  fileManager.subscribe(() => queueDraft());
  function queueDraft() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (!fileManager.isDirty()) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: fileManager.getFilename(), code: codePane.getValue(), at: Date.now() }));
      } catch { /* storage full or blocked: nothing to do */ }
    }, 800);
  }
  (async () => {
    let draft: { name: string; code: string; at: number } | null = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { draft = null; }
    if (!draft || !draft.code) return;
    const when = new Date(draft.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const ok = await confirmDialog('Pick Up Where You Left Off?', `<p>ScryPad kept an unsaved draft of <b>${escapeHtml(draft.name)}</b> from ${escapeHtml(when)}.</p>`, 'Restore Draft', 'Discard');
    if (ok) {
      codePane.setValue(draft.code);
      previewPane.render(draft.code);
      coordinator.updateStats();
      checkDocumentIntegrity(draft.code);
      updateBlankPage(draft.code);
      fileManager.setFilename(draft.name);
      fileManager.markDirty(true);
      showToast('✦ Draft restored. Save it to keep it');
    } else {
      clearDraft();
    }
  })();

  // --- Drop a file onto ScryPad to open it ---
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
  window.addEventListener('drop', async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    if (!/\.(html?|svg|txt|md|css|js)$/i.test(file.name)) {
      await showDialog({ title: 'ScryPad Can\'t Read This Yet', bodyHtml: '<p>ScryPad opens web pages (.html) and text-based files. See Help › What ScryPad Can Read.</p>' });
      return;
    }
    if (fileManager.isDirty() && !(await confirmDialog('Open This File?', '<p>Your current changes aren\'t saved yet.</p>', 'Open File', 'Keep Editing'))) return;
    const text = await file.text();
    fileManager.setUntitled();
    fileManager.setFilename(file.name);
    codePane.setValue(text);
    previewPane.render(text);
    coordinator.updateStats();
    checkDocumentIntegrity(text);
    updateBlankPage(text);
    fileManager.markDirty(false);
    showToast(`✦ Opened ${file.name}. Use Save As to save it`);
  });

  // --- Phone: Tweak tab shows the tweak tools ---
  const phoneTabTweak = document.getElementById('phone-tab-tweak');
  phoneTabTweak?.addEventListener('click', () => {
    const open = !document.body.classList.contains('tweak-open');
    document.body.classList.toggle('tweak-open', open);
    phoneTabTweak.classList.toggle('is-active', open);
    phoneTabTweak.setAttribute('aria-pressed', String(open));
    if (open) setViewMode('preview');
  });

  // --- View › Word Wrap ---
  const labelWrap = document.getElementById('label-wrap');
  const applyWrap = (on: boolean) => {
    codePane.setWordWrap(on);
    if (labelWrap) labelWrap.textContent = on ? 'On' : 'Off';
    document.getElementById('menu-view-wrap')?.classList.toggle('is-on', on);
    try { localStorage.setItem('scrypad_wrap', on ? 'on' : 'off'); } catch { /* ignore */ }
  };
  let wrapPref = false;
  try { wrapPref = localStorage.getItem('scrypad_wrap') === 'on'; } catch { /* ignore */ }
  applyWrap(wrapPref);
  document.getElementById('menu-view-wrap')?.addEventListener('click', () => applyWrap(!codePane.isWordWrap()));

  // App Theme: ScryPad itself in Dark or Light (the toolbar's Light/Dark only previews your page)
  const applyAppTheme = (theme: 'dark' | 'light') => {
    if (theme === 'light') document.documentElement.setAttribute('data-app-theme', 'light');
    else document.documentElement.removeAttribute('data-app-theme');
    const label = document.getElementById('label-app-theme');
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f1f9' : '#0f0b16');
    try { localStorage.setItem('scrypad_app_theme', theme); } catch { /* ignore */ }
  };
  applyAppTheme(document.documentElement.getAttribute('data-app-theme') === 'light' ? 'light' : 'dark');
  document.getElementById('menu-view-app-theme')?.addEventListener('click', () => {
    closeAllMenus();
    applyAppTheme(document.documentElement.getAttribute('data-app-theme') === 'light' ? 'dark' : 'light');
  });

  // --- Help menu ---
  document.getElementById('menu-help-tour')?.addEventListener('click', () => { closeAllMenus(); showTour(); });
  document.getElementById('menu-help-keys')?.addEventListener('click', () => {
    const nk = isDesktopApp ? 'Ctrl+N' : 'Ctrl+Alt+N';
    const rows: [string, string][] = [
      ['New Page', nk], ['Open File', 'Ctrl+O'], ['Save', 'Ctrl+S'], ['Save As', 'Ctrl+Shift+S'],
      ['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Y'], ['Find', 'Ctrl+F'], ['Find &amp; Replace', 'Ctrl+H'],
      ['Tidy Code', 'Ctrl+Shift+F'], ['Bold (in the preview)', 'Ctrl+B'], ['Italic (in the preview)', 'Ctrl+I'], ['Underline (in the preview)', 'Ctrl+U'], ['Link (in the preview)', 'Ctrl+K'],
      ['Indent', 'Tab'], ['Close a window or menu', 'Esc'],
    ];
    showDialog({
      title: 'Keyboard Shortcuts',
      bodyHtml: '<table><thead><tr><th>Action</th><th>Keys</th></tr></thead><tbody>' + rows.map(([a, k]) => `<tr><td>${a}</td><td><kbd>${k}</kbd></td></tr>`).join('') + '</tbody></table>' + (isDesktopApp ? '' : '<p style="margin-top:10px">In a browser, Ctrl+N opens a new window, so New Page uses Ctrl+Alt+N.</p>'),
    });
  });
  document.getElementById('menu-help-read')?.addEventListener('click', () => {
    showDialog({
      title: 'What ScryPad Can Read',
      wide: true,
      bodyHtml: '<p>ScryPad is made for web pages. Open a whole .html file with its styles, or use Open Folder so its images and stylesheets load too.</p>'
        + '<table><thead><tr><th>File</th><th>Colored Code</th><th>Live Preview</th><th>Click to Edit</th></tr></thead><tbody>'
        + '<tr><td>HTML (.html)</td><td>Yes</td><td>The page itself</td><td>Text and color</td></tr>'
        + '<tr><td>CSS, JavaScript</td><td>Inside your page</td><td>Through the page that uses them</td><td>No</td></tr>'
        + '<tr><td>Images in a folder</td><td>No</td><td>Shown in your page</td><td>No</td></tr>'
        + '</tbody></table>'
        + '<p style="margin-top:10px">Markdown (.md), diagrams (.mmd) and SVG with their own previews are on the way.</p>',
    });
  });
  document.getElementById('menu-help-about')?.addEventListener('click', () => {
    showDialog({
      title: 'About ScryPad',
      wide: true,
      bodyHtml: '<img src="icon.svg" alt="" class="sp-wisp">'
        + '<p><b>Build, See, and Learn the Web.</b> A distraction-free live HTML editor with tools to help you build your page and learn while you do!</p>'
        + '<p>When I started learning, I\'d edit the code, hope it was right, upload it by FTP, refresh, see it was wrong, and repeat. ScryPad turns that loop into "type and see it".</p>'
        + '<p>Use ScryPad on your own pages and pages you have the rights to, and respect other people\'s work.</p>'
        + '<p>Built by Interstatus Lab. Open source under the MIT License.</p>',
    });
  });

  // Run initial integrity check
  checkDocumentIntegrity('');

  // First visit: show the tour (not when ScryPad opened a file or has a draft to restore)
  let hasDraft = false;
  try { hasDraft = !!localStorage.getItem('scrypad_draft'); } catch { /* ignore */ }
  if (!hasSeenTour() && !hasDraft) {
    setTimeout(() => { if (!isDialogOpen() && !codePane.getValue().trim()) showTour(); }, 600);
  }
});
