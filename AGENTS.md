# AGENTS.md

## このリポジトリについて

個人用WEBメモシステムの**ソースコード管理リポジトリ**。  
GitHub Pages でフロントエンドを公開し、GitHub API 経由でメモデータを読み書きする。

## 対応する GitHub リポジトリ

- リポジトリ名：`my-memo`
- 公開設定：Private
- GitHub Pages：`frontend/` ディレクトリを公開ディレクトリとして設定

## ディレクトリ構成

```
my-memo/
├── frontend/               ← フロントエンド資材（GitHub Pages で配信）
│   ├── index.html          ← 画面構造
│   ├── style.css           ← スタイル
│   └── js/
│       ├── app.js          ← 画面描画・UIイベント処理
│       ├── api.js          ← API呼び出し口（将来バックエンドへの差し替えポイント）
│       └── memo.js         ← MDパース・エントリ操作ロジック
├── backend/                ← バックエンド資材（フェーズ2で追加・現時点では空）
└── doc/                    ← 設計書類（作業完了後に doc\ から移動）
```

## システム構成

```
ブラウザ
  ↓ ページを開く
GitHub Pages（frontend/ を配信）
  ↓ 画面構成後
GitHub API（メモの読み書き）
  ↓
my-memo-data リポジトリ（data/memo.md）
```

## 関連リポジトリ

| リポジトリ | 役割 |
|---|---|
| `my-memo`（本リポジトリ） | ソースコード管理 |
| `my-memo-data` | メモデータ専用（memo.md の置き場） |

## 開発フェーズ

| フェーズ | 内容 | 状態 |
|---|---|---|
| フェーズ1 | frontend/ のみで GitHub API を直接呼ぶ構成 | 開発中 |
| フェーズ2 | backend/ にサーバーレス関数を追加（Cloudflare Workers / Vercel Functions） | 未着手 |

## 重要な設計方針

- `api.js` は GitHub API の呼び出しを担当する。フェーズ2移行時はここだけ差し替える
- TOKEN（Fine-grained PAT）はブラウザの localStorage に保存する（自分専用ツールとして割り切り）
- メモデータは `my-memo-data` リポジトリで管理し、ソース履歴と混在させない
- 詳細は `doc/` 配下の設計書を参照
