# git 運用メモ

## my-memo の git 管理方針

`my-memo/` は `prj-rosso7001` のサブディレクトリに置いたまま、独立した git リポジトリとして管理する。

- `prj-rosso7001/my-memo/` の中に `.git/` を作成（`git init`）
- `my-memo` リポジトリを GitHub に別途作成し、remote に設定して push
- `prj-rosso7001` 側からは `my-memo/` がサブディレクトリとして普通に追跡される
- `my-memo/` 内でコミットすると、親 repo の `git status` に `modified: my-memo (new commits)` が出る場合がある

### 初回セットアップコマンド

```bash
cd {ワークスペースルート}/my-memo
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/rosso7001/my-memo.git
git push -u origin main
```

### 通常の push（更新時）

```bash
cd {ワークスペースルート}/my-memo
git add .
git commit -m "update"
git push
```

### `modified: my-memo (new commits)` が出た場合

`my-memo/` 内でコミットすると、親 repo（`prj-rosso7001`）の `git status` に以下が表示されることがある。

```
Changes not staged for commit:
  modified:   my-memo (new commits)
```

これは親 repo が `my-memo/` をサブモジュール的に認識しているために起きる表示。  
**対処方法は2択：**

#### A. 親 repo にも記録する（推奨）

```bash
cd {ワークスペースルート}
git add my-memo
git commit -m "update my-memo ref"
git push
```

#### B. 無視する

親 repo での `my-memo/` の追跡が不要であれば、`.gitignore` に追記して非表示にする。

```
# prj-rosso7001/.gitignore
my-memo/
```

---

## GitHub Pages の制約（2026年11月時点）

### Private repo では GitHub Pages が使えない（無料プラン）

- Free プランでは Private リポジトリに GitHub Pages を設定できない
- 有料プラン（Pro / Team / Enterprise）にアップグレードするか、**Public に変更**する必要がある
- `my-memo` はソースコードのみ（メモデータは `my-memo-data`（Private）に分離）のため Public にしても問題なし

### Pages の公開フォルダは `/root` か `/docs` のみ

- GitHub Pages の Branch 設定でフォルダを選択できるのは `/(root)` と `/docs` の2択のみ
- 任意のフォルダ名（例：`/frontend`）は指定できない
- 対応策として `index.html` をルートに移動し、CSS/JS パスを `frontend/` 付きに修正して対応した

```
my-memo/
├── index.html        ← ルートに配置（GitHub Pages の公開対象）
└── frontend/
    ├── style.css
    └── js/
        ├── app.js
        ├── api.js
        └── memo.js
```

---

## その他メモ

### Git グローバル設定（初回のみ）

```bash
git config --global user.name "rosso7001"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main   # デフォルトブランチを main に統一
```

設定は `C:\Users\{ユーザー名}\.gitconfig` に保存される。

### ブランチ名を master → main にリネーム

古いバージョンの Git は `git init` 時のデフォルトブランチが `master` になる。  
以下でリネームしてから push する。

```bash
git branch -m master main
git push -u origin main
```
