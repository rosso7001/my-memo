/**
 * memo.js
 * MDテキストのパース・エントリ操作ロジック
 *
 * エントリ構造:
 *   ### yyyymmddhhmmss
 *   本文テキスト（複数行可）
 */

/**
 * MDテキストをエントリ配列に分解する
 * @param {string} mdText
 * @returns {Array<{timestamp: string, content: string}>}
 */
export function parseEntries(mdText) {
  const entries = [];
  const lines = mdText.split('\n');
  let current = null;

  for (const line of lines) {
    const match = line.match(/^### (\d{14})$/);
    if (match) {
      if (current !== null) {
        entries.push({
          timestamp: current.timestamp,
          content: current.lines.join('\n').trim(),
        });
      }
      current = { timestamp: match[1], lines: [] };
    } else if (current !== null) {
      current.lines.push(line);
    }
  }

  if (current !== null) {
    entries.push({
      timestamp: current.timestamp,
      content: current.lines.join('\n').trim(),
    });
  }

  return entries;
}

/**
 * エントリ配列をMDテキストに変換する
 * @param {Array<{timestamp: string, content: string}>} entries
 * @returns {string}
 */
export function entriesToMd(entries) {
  if (entries.length === 0) return '';
  return entries
    .map(e => `### ${e.timestamp}\n${e.content}`)
    .join('\n\n') + '\n';
}

/**
 * 現在日時から yyyymmddhhmmss 文字列を生成する
 * @returns {string}
 */
export function nowTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/**
 * timestamp を表示用文字列に変換する
 * "20261124143022" → "2026/11/24 14:30:22"
 * @param {string} ts
 * @returns {string}
 */
export function formatTimestamp(ts) {
  return `${ts.slice(0, 4)}/${ts.slice(4, 6)}/${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`;
}

/**
 * 先頭にエントリを追加した新しい配列を返す
 * @param {Array} entries
 * @param {string} content
 * @returns {Array}
 */
export function addEntry(entries, content) {
  return [{ timestamp: nowTimestamp(), content }, ...entries];
}

/**
 * 指定 timestamp のエントリ本文を書き換えた新しい配列を返す
 * @param {Array} entries
 * @param {string} timestamp
 * @param {string} newContent
 * @returns {Array}
 */
export function editEntry(entries, timestamp, newContent) {
  return entries.map(e =>
    e.timestamp === timestamp ? { ...e, content: newContent } : e
  );
}

/**
 * 指定 timestamp のエントリを除去した新しい配列を返す
 * @param {Array} entries
 * @param {string} timestamp
 * @returns {Array}
 */
export function deleteEntry(entries, timestamp) {
  return entries.filter(e => e.timestamp !== timestamp);
}

/**
 * 当該年月のファイル名を返す（例: "202611.md"）
 * @returns {string}
 */
export function currentYearMonthFile() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}.md`;
}
