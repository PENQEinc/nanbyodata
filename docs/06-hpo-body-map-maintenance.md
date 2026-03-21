# HPO Body Map Maintenance

このドキュメントは、summary ページで利用する「人体部位 → HPO カテゴリ」対応表を、四半期ごとに無理なく更新するための運用手順をまとめたものです。

## 目的

- 最新の HPO に追従する
- summary ページの人体 2D ナビゲーション用カテゴリを安定運用する
- 手作業を最小化しつつ、誤った自動マッピングを防ぐ

## 基本方針

- HPO はページ表示時に都度取得しない
- 公式リリースを定期的に repo に取り込む
- summary ページが直接使うのは、生成済みの JSON とする
- 人体部位との対応付けは、完全自動ではなく半自動で管理する

## 取得元

- 公式 HPO リリースを使う
- 推奨取得元
  - OBO Foundry: `hp.obo`
  - GitHub Releases: `obophenotype/human-phenotype-ontology`

参考:
- [OBO Foundry HPO](https://obofoundry.org/ontology/hp.html)
- [HPO Releases](https://github.com/obophenotype/human-phenotype-ontology/releases)

## 更新頻度

- 基本は四半期ごと
- 目安
  - 1月
  - 4月
  - 7月
  - 10月

必要に応じて、summary ページの人体ナビに影響するカテゴリ追加や名称変更があった場合は臨時更新する。

## 管理対象

想定する管理対象は次の 3 つ。

1. HPO 生データ
- 例: `ontology/hpo/YYYY-MM-DD/hp.obo`

2. 人体部位の定義ファイル
- 例: `config/hpo_body_regions.json`
- 人体イラスト側の部位キーを定義する

3. summary ページ用の生成 JSON
- 例: `static/data/hpo-body-map.json`
- summary ページはこの JSON を読む

## 更新手順

1. 最新の `hp.obo` を取得する
- 新しい HPO リリースから `hp.obo` をダウンロードする
- 日付付きディレクトリに保存する

2. `HP:0000118` 直下カテゴリを抽出する
- 対象は `Phenotypic abnormality (HP:0000118)` の子カテゴリ
- summary ページでは、この直下カテゴリを人体ナビの候補として扱う

3. 人体部位との対応表を照合する
- 既知カテゴリ
  - 既存マッピングを維持する
- 新規カテゴリ
  - 人体部位に割り当てるか
  - イラスト外の補助カテゴリとするか
  を判断する

4. summary 用 JSON を生成する
- 生成結果を `static/data/hpo-body-map.json` に出力する
- 生成スクリプトの例
  - `python3 scripts/build_hpo_body_map.py --obo path/to/hp.obo`

5. 差分を確認する
- 追加カテゴリ
- 削除カテゴリ
- ラベル変更
- 既存部位への影響

6. ブラウザで summary ページを確認する
- 日本語ページ
- 英語ページ
- 人体イラストから各カテゴリへ遷移できるか

## 更新時の判断基準

### 人体部位に割り当てるカテゴリ

- `Abnormality of head or neck`
- `Abnormality of the eye`
- `Abnormality of the ear`
- `Abnormality of the nervous system`
- `Abnormality of the endocrine system`
- `Abnormality of the cardiovascular system`
- `Abnormality of the respiratory system`
- `Abnormality of the thoracic cavity`
- `Abnormality of the digestive system`
- `Abnormality of the genitourinary system`
- `Abnormality of blood and blood-forming tissues`
- `Abnormality of the immune system`
- `Abnormality of the integument`
- `Abnormality of the musculoskeletal system`
- `Abnormality of limbs`
- `Abnormality of the breast`
- `Abnormality of the voice`

### イラスト外で扱うカテゴリ

- `Growth abnormality`
- `Constitutional symptom`
- `Abnormality of metabolism/homeostasis`
- `Abnormality of prenatal development or birth`
- `Neoplasm`
- `Abnormal cellular phenotype`

これらは、人体の特定部位に置くよりも、補助リンクや別カテゴリとして扱う方が自然。

## レビュー観点

- `HP:0000118` 直下カテゴリ数に変化がないか
- 名称変更だけなのか、新規カテゴリ追加なのか
- 日本語 UI と英語 UI で違和感がないか
- 既存の人体部位キーを壊していないか
- summary ページ上のジャンプ先カテゴリと整合しているか

## 望ましい将来形

- `scripts/build_hpo_body_map.py` を用意する
- `config/hpo_body_regions.json` を人間管理の定義ファイルとする
- `hp.obo` 更新時に `static/data/hpo-body-map.json` を自動生成する
- 未対応カテゴリがあれば警告を出す

この形にすると、四半期ごとの更新作業は「新しい HPO を置く → スクリプトを実行 → 差分を確認する」に整理できる。

## 最低限の運用ルール

- HPO を更新したら、summary ページの日本語/英語表示を両方確認する
- 自動生成結果をそのまま盲信せず、カテゴリ差分は必ずレビューする
- 人体部位への割り当て判断は、Ontology 更新と UI 意図の両方から確認する
