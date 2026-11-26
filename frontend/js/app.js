/**
 * app.js
 * 画面描画・UIイベント処理
 */

import { parseEntries, entriesToMd, addEntry, editEntry, deleteEntry, formatTimestamp, currentYearMonthFile } from './memo.js';
import { fetchFile, saveFile, fetchFileList } from './api.js';

// 現在読み込んでいるファイルの SHA をキャッシュ
let currentSha = null;
let currentEntries = [];
let currentFile = null;  // 現在選択中のファイル名（例: "202611.md"）

// ---- 設定チェック ----

function isConfigured() {
  return (
    localStorage.getItem('memo_token') &&
    localStorage.getItem('memo_owner') &&
    localStorage.getItem('memo_repo')
  );
}

function showSettings() {
  document.getElementById('settings-area').style.display = 'block';
  document.getElementById('main-area').style.display = 'none';
}

function showMain() {
  document.getElementById('settings-area').style.display = 'none';
  document.getElementById('main-area').style.display = 'block';
}

// ---- ローディング表示 ----

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'block' : 'none';
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isError ? 'status error' : 'status';
}

// ---- エントリ一覧の描画 ----

function renderEntries(entries) {
  const list = document.getElementById('entry-list');
  list.innerHTML = '';

  if (entries.length === 0) {
    list.innerHTML = '<p class="empty">メモがありません</p>';
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'entry-item';
    item.dataset.timestamp = entry.timestamp;

    item.innerHTML = `
      <div class="entry-header">
        <span class="entry-date">${formatTimestamp(entry.timestamp)}</span>
        <div class="entry-actions">
          <button class="btn-edit" data-ts="${entry.timestamp}">編集</button>
          <button class="btn-delete" data-ts="${entry.timestamp}">削除</button>
        </div>
      </div>
      <div class="entry-body" data-ts="${entry.timestamp}">
        ${marked.parse(entry.content)}
      </div>
    `;

    list.appendChild(item);
  });

  // 編集ボタン
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => onEditClick(btn.dataset.ts));
  });

  // 削除ボタン
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => onDeleteClick(btn.dataset.ts));
  });
}

// ---- データ読み込み ----

async function loadMemo(file) {
  setLoading(true);
  setStatus('');
  try {
    currentFile = file;
    const { content, sha } = await fetchFile(`data/${file}`);
    currentSha = sha;
    currentEntries = parseEntries(content);
    renderEntries(currentEntries);
  } catch (e) {
    setStatus(`読み込みエラー: ${e.message}`, true);
  } finally {
    setLoading(false);
  }
}

// ---- 保存共通 ----

async function saveMemo(entries, message) {
  const file = currentFile;
  const mdText = entriesToMd(entries);
  await saveFile(`data/${file}`, mdText, currentSha, message);
  // 保存後に SHA を更新するため再取得
  const { sha } = await fetchFile(`data/${file}`);
  currentSha = sha;
  currentEntries = entries;
}

// ---- 追加 ----

async function onAddClick() {
  const textarea = document.getElementById('add-input');
  const content = textarea.value.trim();
  if (!content) return;

  setLoading(true);
  setStatus('');
  try {
    const entries = addEntry(currentEntries, content);
    await saveMemo(entries, `メモ追加`);
    textarea.value = '';
    renderEntries(currentEntries);
    setStatus('追加しました');
  } catch (e) {
    setStatus(`追加エラー: ${e.message}`, true);
  } finally {
    setLoading(false);
  }
}

// ---- 編集 ----

function onEditClick(ts) {
  const entry = currentEntries.find(e => e.timestamp === ts);
  if (!entry) return;

  const bodyEl = document.querySelector(`.entry-body[data-ts="${ts}"]`);
  const headerEl = bodyEl.previousElementSibling;

  // テキストエリアに展開
  bodyEl.innerHTML = `
    <textarea class="edit-textarea">${entry.content}</textarea>
    <div class="edit-actions">
      <button class="btn-save-edit" data-ts="${ts}">保存</button>
      <button class="btn-cancel-edit" data-ts="${ts}">キャンセル</button>
    </div>
  `;

  // 編集・削除ボタンを非表示
  headerEl.querySelector('.entry-actions').style.display = 'none';

  bodyEl.querySelector('.btn-save-edit').addEventListener('click', () => onSaveEdit(ts));
  bodyEl.querySelector('.btn-cancel-edit').addEventListener('click', () => renderEntries(currentEntries));
}

async function onSaveEdit(ts) {
  const textarea = document.querySelector(`.entry-body[data-ts="${ts}"] .edit-textarea`);
  const newContent = textarea.value.trim();
  if (!newContent) return;

  setLoading(true);
  setStatus('');
  try {
    const entries = editEntry(currentEntries, ts, newContent);
    await saveMemo(entries, `メモ編集`);
    renderEntries(currentEntries);
    setStatus('更新しました');
  } catch (e) {
    setStatus(`更新エラー: ${e.message}`, true);
  } finally {
    setLoading(false);
  }
}

// ---- 削除 ----

async function onDeleteClick(ts) {
  if (!confirm('このメモを削除しますか？')) return;

  setLoading(true);
  setStatus('');
  try {
    const entries = deleteEntry(currentEntries, ts);
    await saveMemo(entries, `メモ削除`);
    renderEntries(currentEntries);
    setStatus('削除しました');
  } catch (e) {
    setStatus(`削除エラー: ${e.message}`, true);
  } finally {
    setLoading(false);
  }
}

// ---- 設定保存 ----

function onSaveSettings() {
  const token = document.getElementById('input-token').value.trim();
  const owner = document.getElementById('input-owner').value.trim();
  const repo  = document.getElementById('input-repo').value.trim();

  if (!token || !owner || !repo) {
    alert('すべての項目を入力してください');
    return;
  }

  localStorage.setItem('memo_token', token);
  localStorage.setItem('memo_owner', owner);
  localStorage.setItem('memo_repo',  repo);

  showMain();
  initMonthSelect();
}

// ---- 初期化 ----

// ---- 年月プルダウン ----

async function initMonthSelect() {
  const select = document.getElementById('month-select');
  select.innerHTML = '';

  const files = await fetchFileList();
  const thisMonth = currentYearMonthFile();  // 例: "202611.md"

  // ファイルが存在しない場合は当月ファイルをダミーとして追加
  const list = files.length > 0 ? files : [thisMonth];

  // 新しい順（辞書順降順）で並べる
  list.sort((a, b) => b.localeCompare(a));

  list.forEach(name => {
    const yyyymm = name.replace('.md', '');
    const label = `${yyyymm.slice(0, 4)}年${yyyymm.slice(4, 6)}月`;
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = label;
    if (name === thisMonth) opt.selected = true;
    select.appendChild(opt);
  });

  // 初期ロード
  await loadMemo(select.value);

  select.addEventListener('change', () => loadMemo(select.value));
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isConfigured()) {
    showSettings();
  } else {
    showMain();
    initMonthSelect();
  }

  document.getElementById('btn-add').addEventListener('click', onAddClick);
  document.getElementById('btn-save-settings').addEventListener('click', onSaveSettings);
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    document.getElementById('input-token').value = localStorage.getItem('memo_token') || '';
    document.getElementById('input-owner').value = localStorage.getItem('memo_owner') || '';
    document.getElementById('input-repo').value  = localStorage.getItem('memo_repo')  || '';
    showSettings();
  });
  document.getElementById('btn-cancel-settings').addEventListener('click', () => {
    if (isConfigured()) showMain();
  });
});
