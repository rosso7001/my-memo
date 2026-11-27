/**
 * app.js
 * 画面描画・UIイベント処理
 */

import { parseEntries, entriesToMd, addEntry, editEntry, deleteEntry, formatTimestamp, currentYearMonthFile } from './memo.js';
import { fetchFile, saveFile, fetchFileList, deleteFile } from './api.js';

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
    // 当月以外は追加エリアを非表示、マージエリアを表示
    const isCurrentMonth = (file === currentYearMonthFile());
    document.querySelector('.add-area').style.display   = isCurrentMonth ? 'block' : 'none';
    document.querySelector('.merge-area').style.display = isCurrentMonth ? 'none'  : 'flex';
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

// ---- ファイルマージ ----

/**
 * fileList の中から file より未来で最も近い年月のファイル名を返す
 * 見つからない場合は null
 */
function findMergeTarget(file, fileList) {
  const src = file.replace('.md', '');
  const candidates = fileList
    .map(f => f.replace('.md', ''))
    .filter(yyyymm => yyyymm > src)
    .sort();
  return candidates.length > 0 ? candidates[0] + '.md' : null;
}

async function onMergeClick() {
  const files = await fetchFileList();
  const targetFile = findMergeTarget(currentFile, files);
  if (!targetFile) {
    setStatus('マージ先ファイルが見つかりません', true);
    return;
  }

  if (!confirm(`${currentFile} の内容を ${targetFile} にマージします。よろしいですか？`)) return;

  setLoading(true);
  setStatus('');
  try {
    // マージ先・マージ元を取得
    const { content: destContent, sha: destSha } = await fetchFile(`data/${targetFile}`);
    const { sha: srcSha } = await fetchFile(`data/${currentFile}`);

    // エントリを連結（マージ先の末尾にマージ元を付ける）
    const destEntries = parseEntries(destContent);
    const mergedEntries = [...destEntries, ...currentEntries];

    // マージ先を上書き保存
    await saveFile(`data/${targetFile}`, entriesToMd(mergedEntries), destSha, `${currentFile} を ${targetFile} にマージ`);

    // マージ元ファイルを削除
    await deleteFile(`data/${currentFile}`, srcSha, `${currentFile} 削除（マージ済み）`);

    setStatus(`${targetFile} にマージしました`);

    // プルダウンを再構築し、マージ先ファイルへ切り替える
    await initMonthSelect(targetFile);
  } catch (e) {
    setStatus(`マージエラー: ${e.message}`, true);
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

async function initMonthSelect(selectFile = null) {
  const select = document.getElementById('month-select');
  select.innerHTML = '';

  const files = await fetchFileList();
  const thisMonth = currentYearMonthFile();  // 例: "202611.md"

  // ファイルが存在しない場合は当月ファイルをダミーとして追加
  const list = files.length > 0 ? files : [thisMonth];

  // 新しい順（辞書順降順）で並べる
  list.sort((a, b) => b.localeCompare(a));

  // 初期選択：引数指定があればそれを優先、なければ当月
  const initialFile = (selectFile && list.includes(selectFile)) ? selectFile : thisMonth;

  list.forEach(name => {
    const yyyymm = name.replace('.md', '');
    const label = `${yyyymm.slice(0, 4)}年${yyyymm.slice(4, 6)}月`;
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = label;
    if (name === initialFile) opt.selected = true;
    select.appendChild(opt);
  });

  // 初期ロード
  await loadMemo(select.value);

  select.addEventListener('change', () => loadMemo(select.value));
}

// ---- 音声入力 ----

/**
 * Web Speech API でマイク入力を初期化する。
 * 戻り値: 音声認識を開始する関数（ブラウザ非対応時は null）
 */
function initSpeechInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('btn-mic');

  // Web Speech API 非対応、またはスマホ以外はボタンを非表示にして終了
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!SpeechRecognition || !isMobile) {
    btn.style.display = 'none';
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = false;
  recognition.continuous = true;

  let isListening = false;

  function startMic() {
    recognition.start();
    isListening = true;
    btn.textContent = '⏹️';
    btn.classList.add('listening');
  }

  function stopMic() {
    recognition.stop();
    isListening = false;
    btn.textContent = '🎤';
    btn.classList.remove('listening');
  }

  recognition.onresult = (e) => {
    const textarea = document.getElementById('add-input');
    for (let i = e.resultIndex; i < e.results.length; i++) {
      textarea.value += e.results[i][0].transcript;
    }
  };

  // 認識が自動終了した場合（continuous でも端末によって止まることがある）に再起動
  recognition.onend = () => {
    if (isListening) recognition.start();
  };

  btn.addEventListener('click', () => {
    if (isListening) {
      stopMic();
    } else {
      startMic();
    }
  });

  return startMic;
}

document.addEventListener('DOMContentLoaded', () => {
  const micParam = new URLSearchParams(location.search).get('mic');

  if (!isConfigured()) {
    showSettings();
  } else {
    showMain();
    initMonthSelect();
  }

  const startMic = initSpeechInput();

  // ?mic=1 かつ設定済みの場合は自動でマイクON
  if (micParam === '1' && isConfigured() && startMic) {
    startMic();
  }

  document.getElementById('btn-add').addEventListener('click', onAddClick);
  document.getElementById('btn-merge').addEventListener('click', onMergeClick);
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
