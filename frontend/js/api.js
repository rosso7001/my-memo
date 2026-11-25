/**
 * api.js
 * GitHub API 呼び出し口
 *
 * フェーズ2移行時はここだけバックエンド呼び出しに差し替える。
 *
 * 設定値は localStorage に保存された以下のキーを使用:
 *   memo_token  : GitHub Fine-grained PAT
 *   memo_owner  : リポジトリオーナー（例: "yourname"）
 *   memo_repo   : データリポジトリ名（例: "my-memo-data"）
 */

const BASE = 'https://api.github.com';

function getConfig() {
  return {
    token: localStorage.getItem('memo_token') || '',
    owner: localStorage.getItem('memo_owner') || '',
    repo:  localStorage.getItem('memo_repo')  || '',
  };
}

function headers() {
  const { token } = getConfig();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * 指定ファイルの内容と SHA を取得する
 * @param {string} path - リポジトリ内パス（例: "data/2026.md"）
 * @returns {Promise<{content: string, sha: string}>}
 *   content はデコード済みのテキスト、ファイル未存在時は content: '' sha: null
 */
export async function fetchFile(path) {
  const { owner, repo } = getConfig();
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: headers() });

  if (res.status === 404) {
    return { content: '', sha: null };
  }

  if (!res.ok) throw new Error(`GitHub API GET failed: ${res.status}`);

  const json = await res.json();
  const content = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  return { content, sha: json.sha };
}

/**
 * 指定ファイルを新しい内容で上書き保存する
 * @param {string} path - リポジトリ内パス（例: "data/2026.md"）
 * @param {string} content - 保存するテキスト
 * @param {string|null} sha - 既存ファイルの SHA（新規作成時は null）
 * @param {string} message - コミットメッセージ
 * @returns {Promise<void>}
 */
export async function saveFile(path, content, sha, message) {
  const { owner, repo } = getConfig();
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`GitHub API PUT failed: ${res.status}`);
}
