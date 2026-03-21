#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


ROOT = Path(__file__).resolve().parent.parent
BASES_PATH = ROOT / "config" / "character_bases.json"
MAP_PATH = ROOT / "config" / "disease_character_map.json"


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_prompt(category: Dict[str, Any], base: Dict[str, Any], disease: Dict[str, Any]) -> Dict[str, str]:
    category_name_ja = category["name_ja"]
    category_name_en = category["name_en"]
    base_name_ja = base["name_ja"]
    base_name_en = base["name_en"]
    base_asset = base["asset"]
    series_reference = category["series_reference_asset"]

    common_ja = "\n".join(f"- {item}" for item in category["common_style_ja"])
    common_en = "\n".join(f"- {item}" for item in category["common_style_en"])
    silhouette_ja = "\n".join(f"- {item}" for item in base["silhouette_ja"])
    silhouette_en = "\n".join(f"- {item}" for item in base["silhouette_en"])
    variant_ja = "\n".join(f"- {item}" for item in disease["variant_rules_ja"])
    variant_en = "\n".join(f"- {item}" for item in disease["variant_rules_en"])

    prompt_ja = f"""# {disease['character_name_ja']} 生成指示

## 対象

- 疾患ID: {disease['id']}
- 疾患名: {disease['label_ja']}
- 英語名: {disease['label_en']}
- カテゴリ: {category_name_ja}
- ベース種: {base_name_ja}
- キャラクター名: {disease['character_name_ja']}
- 出力先想定: {disease['output_asset']}

## 参照画像

- シリーズ基準画像: {series_reference}
- 採用済みベース画像: {base_asset}

## シリーズ共通ルール

{common_ja}

## ベース種として残すべき記号

{silhouette_ja}

## 今回の亜種化ルール

{variant_ja}
"""

    prompt_en = f"""# {disease['character_name_en']} Art Prompt

## Target

- Disease ID: {disease['id']}
- Disease name: {disease['label_en']}
- Japanese name: {disease['label_ja']}
- Category: {category_name_en}
- Base species: {base_name_en}
- Character name: {disease['character_name_en']}
- Intended output path: {disease['output_asset']}

## Reference images

- Series anchor image: {series_reference}
- Approved base image: {base_asset}

## Shared series rules

{common_en}

## Keep these base-species markers

{silhouette_en}

## Variant rules for this disease

{variant_en}
"""

    short_ja = (
        f"{disease['character_name_ja']} を作ってください。"
        f"採用済みの {base_name_ja} ベース画像を参照し、その亜種としてデザインしてください。"
        "新しい別種を作るのではなく、同じシリーズ・同じ個体群のバリエーションとして見えるようにしてください。"
        "差分は配色、模様、背板の色味、表情の軽い違いだけにしてください。"
    )

    short_en = (
        f"Create {disease['character_name_en']} as a variant of the approved {base_name_en} base image. "
        "Do not make a completely new species. Keep it in the same mascot series and creature family. "
        "Change only the colors, pattern accents, back plate colors, and a small nuance in expression."
    )

    return {
        "prompt_ja": prompt_ja,
        "prompt_en": prompt_en,
        "short_prompt_ja": short_ja,
        "short_prompt_en": short_en,
    }


def render_markdown(disease: Dict[str, Any], built: Dict[str, str]) -> str:
    return f"""# {disease['id']} {disease['character_name_ja']}

## 日本語

{built['prompt_ja']}

## English

{built['prompt_en']}

## 短縮版

### 日本語

{built['short_prompt_ja']}

### English

{built['short_prompt_en']}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build disease mascot prompts from config JSON.")
    parser.add_argument("--disease", help="Target disease ID such as NANDO:1200656")
    parser.add_argument("--all", action="store_true", help="Build prompts for all configured diseases")
    parser.add_argument("--out-dir", help="Optional output directory for markdown prompt files")
    args = parser.parse_args()

    if not args.all and not args.disease:
      parser.error("Specify --disease or --all")

    bases = load_json(BASES_PATH)["categories"]
    diseases: List[Dict[str, Any]] = load_json(MAP_PATH)["diseases"]

    if args.disease:
        target = args.disease.strip().upper()
        diseases = [item for item in diseases if item["id"].upper() == target]
        if not diseases:
            raise SystemExit(f"Disease not found: {target}")

    out_dir = Path(args.out_dir).resolve() if args.out_dir else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    chunks: List[str] = []
    for disease in diseases:
        category = bases[disease["category_key"]]
        base = category["bases"][disease["base_key"]]
        built = build_prompt(category, base, disease)
        markdown = render_markdown(disease, built)
        chunks.append(markdown)

        if out_dir:
            filename = f"{disease['id'].lower().replace(':', '-')}.md"
            (out_dir / filename).write_text(markdown, encoding="utf-8")

    print("\n\n".join(chunks))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
