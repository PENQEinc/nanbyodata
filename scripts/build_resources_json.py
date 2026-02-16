#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
resources/ja/*.md と resources/en/*.md を走査し、
front matter と本文を集約して static/data/resources.json を生成する。
GitHub Actions などで push 時に実行する想定。
"""

import json
import re
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


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


def filename_to_date(filename):
    """例: 2025-12-10-jcb-1.md -> 2025.12.10"""
    base = filename.replace('.md', '')
    # 先頭の YYYY-MM-DD 部分を取得
    parts = base.split('-')
    if len(parts) >= 3 and len(parts[0]) == 4 and parts[1].isdigit() and parts[2].isdigit():
        return '{}.{}.{}'.format(parts[0], parts[1], parts[2])
    return ''


def normalize_tags(tags):
    """front matter の tags をリストで返す。"""
    if not tags:
        return []
    if isinstance(tags, list):
        return [str(t).strip() for t in tags]
    return [str(tags).strip()]


def build_entries_for_lang(lang):
    """指定言語の resources ディレクトリを走査してエントリのリストを返す。"""
    repo_root = Path(__file__).resolve().parents[1]
    resources_dir = repo_root / 'resources' / lang
    if not resources_dir.is_dir():
        return []

    entries = []
    for path in sorted(resources_dir.glob('*.md'), reverse=True):
        try:
            md_text = path.read_text(encoding='utf-8')
        except Exception as e:
            print('Warning: could not read {}: {}'.format(path, e), file=__import__('sys').stderr)
            continue

        fm, body = extract_front_matter(md_text)
        if fm.get('published') is False:
            continue

        post_id = path.stem
        title = fm.get('title') or '(No Title)'
        if isinstance(title, str):
            title = title.strip().strip("'\"")

        publisher = fm.get('publisher') or ''
        if isinstance(publisher, str):
            publisher = publisher.strip()

        url = fm.get('url') or ''
        if isinstance(url, str):
            url = url.strip()

        tags = normalize_tags(fm.get('tags'))
        authors = fm.get('authors') or ''
        if isinstance(authors, str):
            authors = authors.strip()

        # description: front matter 優先、なければ本文の先頭を利用
        description = fm.get('description') or ''
        if isinstance(description, str):
            description = description.strip()
        if not description and body:
            description = body.strip().split('\n')[0][:500]

        date_str = filename_to_date(path.name)

        entries.append({
            'id': post_id,
            'date': date_str,
            'publisher': publisher,
            'title': title,
            'url': url,
            'tags': tags,
            'description': description,
            'authors': authors,
        })

    # 日付の新しい順。同じ日は resource1, resource2, ... の順
    entries.sort(key=lambda e: e['id'])
    entries.sort(key=lambda e: e['date'], reverse=True)
    return entries


def main():
    repo_root = Path(__file__).resolve().parents[1]
    out_dir = repo_root / 'static' / 'data'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / 'resources.json'

    data = {
        'ja': build_entries_for_lang('ja'),
        'en': build_entries_for_lang('en'),
    }

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Wrote {} ({} ja, {} en)'.format(out_path, len(data['ja']), len(data['en'])))


if __name__ == '__main__':
    main()
