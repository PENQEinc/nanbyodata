#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
posts/ja/*.md と posts/en/*.md を走査し、
front matter と本文を集約して static/data/news.json を生成する。
GitHub Actions などで push 時に実行する想定。
"""

import json
import re
import os
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

try:
    import markdown2
except ImportError:
    markdown2 = None


def extract_front_matter(md_text):
    """YAML front matter を抽出してパースする。"""
    match = re.match(r'^---\n([\s\S]+?)\n---', md_text)
    if not match:
        return {}, md_text
    fm_raw = match.group(1)
    body = md_text[match.end():].strip()

    if yaml:
        try:
            fm = yaml.safe_load(fm_raw)
            return (fm or {}), body
        except Exception:
            pass

    # フォールバック: 簡易 key: value パース（配列は - で始まる行をリストに）
    fm = {}
    lines = fm_raw.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        if ':' in line and not line.strip().startswith('-'):
            key, _, val = line.partition(':')
            key, val = key.strip(), val.strip()
            if val == '' and i + 1 < len(lines) and lines[i + 1].strip().startswith('-'):
                arr = []
                i += 1
                while i < len(lines) and lines[i].strip().startswith('-'):
                    arr.append(lines[i].replace('-', '', 1).strip())
                    i += 1
                fm[key] = arr
                continue
            fm[key] = val
        i += 1
    return fm, body


def md_to_html(md_text):
    """Markdown を HTML に変換。"""
    if markdown2:
        return markdown2.markdown(
            md_text,
            extras=['break-on-newline', 'fenced-code-blocks', 'tables']
        )
    return md_text.replace('\n', '<br>\n')


def filename_to_date(filename):
    """例: 2025-11-26-post1.md -> 2025.11.26"""
    base = filename.replace('.md', '')
    date_part = base.split('-post')[0]
    return date_part.replace('-', '.')


def normalize_tags(tags):
    """front matter の tags をリストで返す。"""
    if not tags:
        return []
    if isinstance(tags, list):
        return [str(t).strip() for t in tags]
    return [str(tags).strip()]


def build_posts_for_lang(lang):
    """指定言語の posts ディレクトリを走査してエントリのリストを返す。"""
    repo_root = Path(__file__).resolve().parents[1]
    posts_dir = repo_root / 'posts' / lang
    if not posts_dir.is_dir():
        return []

    entries = []
    for path in sorted(posts_dir.glob('*.md'), reverse=True):
        try:
            md_text = path.read_text(encoding='utf-8')
        except Exception as e:
            print(f'Warning: could not read {path}: {e}', file=__import__('sys').stderr)
            continue

        fm, body = extract_front_matter(md_text)
        if fm.get('published') is False:
            continue

        post_id = path.stem
        title = fm.get('title') or '(No Title)'
        if isinstance(title, str):
            title = title.strip().strip("'\"")

        tags = normalize_tags(fm.get('tags'))
        date_str = filename_to_date(path.name)

        entries.append({
            'id': post_id,
            'date': date_str,
            'title': title,
            'tags': tags,
            'body': md_to_html(body),
        })

    # 日付の新しい順
    entries.sort(key=lambda e: (e['date'], e['id']), reverse=True)
    return entries


def main():
    repo_root = Path(__file__).resolve().parents[1]
    out_dir = repo_root / 'static' / 'data'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / 'news.json'

    data = {
        'ja': build_posts_for_lang('ja'),
        'en': build_posts_for_lang('en'),
    }

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'Wrote {out_path} ({len(data["ja"])} ja, {len(data["en"])} en)')


if __name__ == '__main__':
    main()
