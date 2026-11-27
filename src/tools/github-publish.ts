// Publish to GitHub Pages with a Personal Access Token: makes the repository (or updates it),
// uploads the site in one commit, and turns on GitHub Pages. Talks only to api.github.com.
import type { ZipEntry } from './site-export.ts';

const API = 'https://api.github.com';
const TOKEN_KEY = 'scrypad_gh_token';
const REPO_KEY = 'scrypad_gh_repo';

export function savedToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function rememberToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}
export function lastRepo(): string {
  try { return localStorage.getItem(REPO_KEY) || ''; } catch { return ''; }
}
function rememberRepo(name: string) {
  try { localStorage.setItem(REPO_KEY, name); } catch { /* storage blocked */ }
}

/** Repository names GitHub accepts: letters, numbers, - _ . */
export function cleanRepoName(name: string): string {
  return name.trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'my-site';
}

export class GitHubError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

// The parts of GitHub's API replies this file reads
interface GhUser { login: string }
interface GhRepo { full_name: string; default_branch?: string; html_url: string }
interface GhRef { object: { sha: string } }
interface GhCommit { sha: string; tree: { sha: string } }
interface GhSha { sha: string }
interface GhTreeItem { path: string; mode: string; type: 'blob'; sha: string }

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GitHubError('ScryPad couldn\'t reach GitHub. Check your internet connection and try again.');
  }
  if (res.status === 204) return null as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GitHubError(body?.message || `GitHub said no (${res.status})`, res.status);
  return body as T;
}

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface PublishResult { siteUrl: string; repoUrl: string; created: boolean }

/**
 * @param onStep short progress messages, e.g. "Uploading 4 files"
 * @param confirmUpdate asked when the repository already exists; return false to stop
 */
export async function publishToPages(
  token: string,
  repoName: string,
  files: ZipEntry[],
  onStep: (msg: string) => void,
  confirmUpdate: (fullName: string) => Promise<boolean>,
): Promise<PublishResult | null> {
  onStep('Checking your GitHub account');
  let user: GhUser;
  try {
    user = await gh<GhUser>(token, '/user');
  } catch (e) {
    if (e instanceof GitHubError && e.status === 401) throw new GitHubError('GitHub didn\'t accept that token. It may be mistyped or expired.', 401);
    throw e;
  }
  const owner: string = user.login;
  const name = cleanRepoName(repoName);

  let repo: GhRepo | null = null;
  let created = false;
  try {
    repo = await gh<GhRepo>(token, `/repos/${owner}/${name}`);
  } catch (e) {
    if (!(e instanceof GitHubError && e.status === 404)) throw e;
  }
  if (repo) {
    if (!(await confirmUpdate(repo.full_name))) return null;
  } else {
    onStep(`Making the ${name} repository`);
    repo = await gh<GhRepo>(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({ name, description: 'Made with ScryPad', private: false, auto_init: true }),
    });
    created = true;
  }
  const branch: string = repo.default_branch || 'main';

  // The newest commit on the branch (a brand-new repository can take a moment to have one)
  let head: GhRef | null = null;
  for (let i = 0; i < 6 && !head; i++) {
    try { head = await gh<GhRef>(token, `/repos/${owner}/${name}/git/ref/heads/${branch}`); }
    catch (e) { if (i === 5) throw e; await new Promise((r) => setTimeout(r, 1000)); }
  }
  const baseCommit = await gh<GhCommit>(token, `/repos/${owner}/${name}/git/commits/${head!.object.sha}`);

  const all = files.some((f) => f.path === '.nojekyll') ? files : [...files, { path: '.nojekyll', data: new Uint8Array() }];
  const tree: GhTreeItem[] = [];
  let n = 0;
  for (const f of all) {
    n++;
    onStep(`Uploading ${n} of ${all.length}: ${f.path}`);
    const blob = await gh<GhSha>(token, `/repos/${owner}/${name}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: b64(f.data), encoding: 'base64' }),
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  onStep('Saving the upload');
  const newTree = await gh<GhSha>(token, `/repos/${owner}/${name}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
  });
  const commit = await gh<GhSha>(token, `/repos/${owner}/${name}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: created ? 'Publish from ScryPad' : 'Update from ScryPad', tree: newTree.sha, parents: [head!.object.sha] }),
  });
  await gh(token, `/repos/${owner}/${name}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  onStep('Turning on GitHub Pages');
  try {
    await gh(token, `/repos/${owner}/${name}/pages`, {
      method: 'POST',
      body: JSON.stringify({ source: { branch, path: '/' } }),
    });
  } catch (e) {
    // 409: Pages is already on, which is fine
    if (!(e instanceof GitHubError && e.status === 409)) throw e;
  }

  rememberRepo(name);
  const isUserSite = name.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return {
    siteUrl: isUserSite ? `https://${owner}.github.io/` : `https://${owner}.github.io/${name}/`,
    repoUrl: repo.html_url,
    created,
  };
}
