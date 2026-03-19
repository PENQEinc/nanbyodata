# ディレクトリ責務一覧

## この資料の目的

NanbyoData は、アプリ本体、画面、データ資産、SPARQList、旧資産が同じリポジトリに入っています。  
最初に「どこを編集すると何が変わるか」を把握しておくと、調査と変更がかなり楽になります。

## 一覧表

| パス | 主な責務 | 主に誰が使うか | 優先度 |
| --- | --- | --- | --- |
| `app.py` | Flask アプリ本体、ルーティング、言語切替、疾患ページ生成 | バックエンド実装者 | 高 |
| `templates/` | 各ページの HTML テンプレート | フロントエンド実装者 | 高 |
| `templates/component/` | ナビゲーションやフッターなどの共通部品 | フロントエンド実装者 | 中 |
| `static/js/` | ページごとの動作、API 呼び出し、画面更新 | フロントエンド実装者 | 高 |
| `static/sass/` | 画面スタイルのソース | フロントエンド実装者 | 中 |
| `static/css/` | 配布用 CSS や外部由来 CSS | フロントエンド実装者 | 低 |
| `static/img/` | 画像、ロゴ、アイコン | デザイナー / 実装者 | 低 |
| `ontology/` | NANDO のリリースデータ一式 | データ担当 / バックエンド実装者 | 高 |
| `annotation/` | 遺伝子・表現型などの注釈データ | データ担当 | 中 |
| `sparqlist/repository/` | SPARQList API クエリ定義 | データ担当 / API担当 | 高 |
| `sparqlist/docker-compose.yml` | SPARQList サービス起動設定 | 運用担当 | 中 |
| `cgi/` | 旧 CGI やデータ変換資産 | 保守担当 | 低 |
| `uwsgi/` | uWSGI 設定、プロセス制御 | 運用担当 | 中 |
| `Dockerfile` | アプリイメージのビルド定義 | 運用担当 | 中 |
| `docker-compose.yml` | 基本の起動構成 | 運用担当 | 高 |
| `docker-compose_for_dev.yml` | 開発用起動構成、nginx 含む | 開発者 | 高 |
| `posts/` | お知らせ記事の原稿 | コンテンツ担当 | 中 |

## 用途別に見ると

### 画面を直したいとき

読む順番:

1. `templates/`
2. `static/js/`
3. `static/sass/`

### 疾患ページの挙動を直したいとき

読む順番:

1. `app.py`
2. `templates/disease.html`
3. `static/js/disease/`
4. `sparqlist/repository/`
5. `ontology/`

### API やデータの中身を追いたいとき

読む順番:

1. `sparqlist/repository/`
2. `ontology/`
3. `annotation/`
4. `app.py`

### 起動やデプロイを確認したいとき

読む順番:

1. `README.md`
2. `Dockerfile`
3. `docker-compose.yml`
4. `docker-compose_for_dev.yml`
5. `uwsgi/uwsgi.ini`

## 初見で迷いやすい点

### `ontology/` は配布データでもあり、実行時参照データでもある

- ダウンロード用ファイル置き場に見える一方で、疾患ページ生成にも関わる
- 単なる静的配布物ではない

### `sparqlist/` はアプリ本体ではなく、API 定義の別レイヤー

- Flask 側の Python コードだけを読んでも、データ取得ロジックの全体は分からない
- API の意味を知るには `sparqlist/repository/` まで見る必要がある

### `cgi/` は最初に追わなくてよい可能性が高い

- 現行の主要導線は Flask 中心
- 調査対象が旧資産でない限り、優先順位は下げてよい

## 推奨する調査スタート地点

- 実装理解: `app.py`
- 画面理解: `templates/index.html`, `templates/disease.html`
- データ理解: `sparqlist/repository/`, `ontology/`
- 実行理解: `docker-compose_for_dev.yml`, `uwsgi/uwsgi.ini`
