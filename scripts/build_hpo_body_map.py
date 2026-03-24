#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


ROOT_HP_ID = "HP:0000118"


def parse_obo(path: Path):
    text = path.read_text(encoding="utf-8")
    terms = []
    current = None
    for line in text.splitlines():
      if line == "[Term]":
        if current:
          terms.append(current)
        current = {}
      elif current is not None and ": " in line:
        key, value = line.split(": ", 1)
        current.setdefault(key, []).append(value)
    if current:
      terms.append(current)

    by_id = {}
    for term in terms:
      term_id = term.get("id", [None])[0]
      if term_id:
        by_id[term_id] = term
    return by_id


def direct_children(by_id, parent_id: str):
    children = []
    for term_id, term in by_id.items():
      for isa in term.get("is_a", []):
        if isa.startswith(f"{parent_id} "):
          children.append(
            {
              "id": term_id,
              "label_en": term.get("name", [""])[0],
            }
          )
    return sorted(children, key=lambda item: item["id"])


def build_output(config: dict, children: list[dict]):
    children_by_id = {item["id"]: item for item in children}

    mapped_regions = []
    warnings = []

    for region in config["body_regions"]:
      hpo_id = region["hpo_id"]
      child = children_by_id.get(hpo_id)
      if not child:
        warnings.append(
          f"Configured body region '{region['key']}' refers to missing direct child {hpo_id}."
        )
      mapped_regions.append(
        {
          "key": region["key"],
          "label_ja": region["label_ja"],
          "label_en": region["label_en"],
          "target_area": region["target_area"],
          "hpo_id": hpo_id,
          "hpo_label_en": child["label_en"] if child else region.get("hpo_label_en", ""),
        }
      )

    mapped_ids = {item["hpo_id"] for item in config["body_regions"]}
    supplemental_ids = {item["hpo_id"] for item in config.get("supplemental_categories", [])}

    unmapped = [
      item for item in children
      if item["id"] not in mapped_ids and item["id"] not in supplemental_ids
    ]

    for item in unmapped:
      warnings.append(
        f"Unmapped direct child under {ROOT_HP_ID}: {item['id']} {item['label_en']}"
      )

    return {
      "version": 1,
      "source_root": config["source_root"],
      "source_root_label": config["source_root_label"],
      "body_regions": mapped_regions,
      "supplemental_categories": config.get("supplemental_categories", []),
      "direct_children": children,
      "unmapped_direct_children": unmapped,
      "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(
      description="Build summary-page HPO body map JSON from hp.obo."
    )
    parser.add_argument(
      "--obo",
      required=True,
      help="Path to hp.obo"
    )
    parser.add_argument(
      "--config",
      default="config/hpo_body_regions.json",
      help="Path to body-region config JSON"
    )
    parser.add_argument(
      "--output",
      default="static/data/hpo-body-map.json",
      help="Output path for generated JSON"
    )
    args = parser.parse_args()

    obo_path = Path(args.obo)
    config_path = Path(args.config)
    output_path = Path(args.output)

    by_id = parse_obo(obo_path)
    children = direct_children(by_id, ROOT_HP_ID)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    output = build_output(config, children)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
      json.dumps(output, ensure_ascii=False, indent=2) + "\n",
      encoding="utf-8"
    )

    print(f"Wrote {output_path}")
    if output["warnings"]:
      print("Warnings:")
      for warning in output["warnings"]:
        print(f"- {warning}")


if __name__ == "__main__":
    main()
