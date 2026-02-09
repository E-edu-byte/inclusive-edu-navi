#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
サイトマップ生成スクリプト
全ページを網羅したsitemap.xmlを自動生成

【対象ページ】
- 静的ページ（トップ、about、privacy、news、search、bookmarks）
- カテゴリページ（6カテゴリ）
- editor-secret-dashboardは除外
"""

import os
import sys
import json
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "sitemap.xml")
ARTICLES_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# サイト設定
SITE_URL = "https://news-navi.jp/inclusive"

# カテゴリID一覧
CATEGORIES = [
    "support",
    "diverse-learning",
    "research",
    "policy",
    "ict",
    "events",
]

# 静的ページ（優先度と更新頻度を設定）
STATIC_PAGES = [
    {"path": "/", "priority": "1.0", "changefreq": "daily"},
    {"path": "/news/", "priority": "0.9", "changefreq": "daily"},
    {"path": "/about/", "priority": "0.6", "changefreq": "monthly"},
    {"path": "/privacy/", "priority": "0.4", "changefreq": "yearly"},
    {"path": "/search/", "priority": "0.7", "changefreq": "weekly"},
    {"path": "/bookmarks/", "priority": "0.5", "changefreq": "weekly"},
]


def get_last_modified():
    """最終更新日を取得（articles.jsonの更新日時）"""
    try:
        if os.path.exists(ARTICLES_FILE):
            with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                last_updated = data.get('lastUpdated')
                if last_updated:
                    # ISO形式をW3C形式に変換
                    dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                    return dt.strftime('%Y-%m-%d')
    except Exception as e:
        print(f"警告: 最終更新日取得エラー - {e}")

    return datetime.now().strftime('%Y-%m-%d')


def generate_sitemap():
    """サイトマップXMLを生成"""
    print("=== サイトマップ生成開始 ===")

    # XML構造を作成
    urlset = Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')

    last_modified = get_last_modified()
    url_count = 0

    # 静的ページを追加
    print("\n静的ページを追加中...")
    for page in STATIC_PAGES:
        url_elem = SubElement(urlset, 'url')

        loc = SubElement(url_elem, 'loc')
        loc.text = f"{SITE_URL}{page['path']}"

        lastmod = SubElement(url_elem, 'lastmod')
        lastmod.text = last_modified

        changefreq = SubElement(url_elem, 'changefreq')
        changefreq.text = page['changefreq']

        priority = SubElement(url_elem, 'priority')
        priority.text = page['priority']

        url_count += 1
        print(f"  ✓ {page['path']}")

    # カテゴリページを追加
    print("\nカテゴリページを追加中...")
    for category_id in CATEGORIES:
        url_elem = SubElement(urlset, 'url')

        loc = SubElement(url_elem, 'loc')
        loc.text = f"{SITE_URL}/category/{category_id}/"

        lastmod = SubElement(url_elem, 'lastmod')
        lastmod.text = last_modified

        changefreq = SubElement(url_elem, 'changefreq')
        changefreq.text = "daily"

        priority = SubElement(url_elem, 'priority')
        priority.text = "0.8"

        url_count += 1
        print(f"  ✓ /category/{category_id}/")

    # XMLを整形して出力
    xml_string = tostring(urlset, encoding='unicode')

    # XML宣言を追加して整形
    dom = minidom.parseString(xml_string)
    pretty_xml = dom.toprettyxml(indent="  ", encoding="UTF-8")

    # 余分な空行を削除
    lines = pretty_xml.decode('utf-8').split('\n')
    clean_lines = [line for line in lines if line.strip()]
    final_xml = '\n'.join(clean_lines)

    # ファイルに保存
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(final_xml)

    print(f"\n=== サイトマップ生成完了 ===")
    print(f"  - URL数: {url_count}件")
    print(f"  - 出力: {OUTPUT_FILE}")

    return url_count


if __name__ == "__main__":
    generate_sitemap()
