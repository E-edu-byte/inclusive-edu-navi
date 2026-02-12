#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
記事除外（ブラックリスト）スクリプト
指定したURLの記事を永久に非表示にする

使用方法:
  python scripts/exclude-article.py --url "https://example.com/article"
  python scripts/exclude-article.py --urls "url1" "url2" "url3"
  echo "url1\nurl2" | python scripts/exclude-article.py --stdin
  python scripts/exclude-article.py --list
"""

import os
import sys
import json
import hashlib
import argparse
from datetime import datetime

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ARTICLES_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")
MANUAL_FILE = os.path.join(PROJECT_ROOT, "public", "data", "manual-articles.json")
AI_PICKS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "ai-picks.json")
EXCLUDED_FILE = os.path.join(PROJECT_ROOT, "public", "data", "excluded-urls.json")


def load_json(filepath):
    """JSONファイルを読み込む"""
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"警告: {filepath} 読み込みエラー - {e}")
    return None


def save_json(filepath, data):
    """JSONファイルを保存"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"エラー: {filepath} 保存失敗 - {e}")
        return False


def add_to_blacklist(url):
    """URLをブラックリストに追加"""
    excluded_data = load_json(EXCLUDED_FILE) or {"excludedUrls": [], "lastUpdated": None}

    if url in excluded_data['excludedUrls']:
        print(f"このURLは既にブラックリストに含まれています: {url}")
        return False

    excluded_data['excludedUrls'].append(url)
    excluded_data['lastUpdated'] = datetime.now().isoformat()

    return save_json(EXCLUDED_FILE, excluded_data)


def remove_from_articles(url):
    """articles.json から記事を削除"""
    articles_data = load_json(ARTICLES_FILE)
    if not articles_data:
        return False, None

    original_count = len(articles_data.get('articles', []))
    removed_article = None

    new_articles = []
    for article in articles_data.get('articles', []):
        if article.get('url', '').strip() == url.strip():
            removed_article = article
            print(f"  削除: {article.get('title', '')[:50]}...")
        else:
            new_articles.append(article)

    if removed_article:
        articles_data['articles'] = new_articles
        articles_data['lastUpdated'] = datetime.now().isoformat()
        save_json(ARTICLES_FILE, articles_data)
        print(f"  articles.json: {original_count} -> {len(new_articles)} 件")

    return removed_article is not None, removed_article


def remove_from_manual(url):
    """manual-articles.json から記事を削除"""
    manual_data = load_json(MANUAL_FILE)
    if not manual_data:
        return False, None

    original_count = len(manual_data.get('articles', []))
    removed_article = None

    new_articles = []
    for article in manual_data.get('articles', []):
        if article.get('url', '').strip() == url.strip():
            removed_article = article
            print(f"  削除（手動記事）: {article.get('title', '')[:50]}...")
        else:
            new_articles.append(article)

    if removed_article:
        manual_data['articles'] = new_articles
        manual_data['lastUpdated'] = datetime.now().isoformat()
        save_json(MANUAL_FILE, manual_data)
        print(f"  manual-articles.json: {original_count} -> {len(new_articles)} 件")

    return removed_article is not None, removed_article


def remove_from_picks_and_refill(url):
    """ai-picks.json から記事を削除し、枠を補填"""
    picks_data = load_json(AI_PICKS_FILE)
    if not picks_data:
        return False

    original_count = len(picks_data.get('picks', []))

    # URLで該当記事を削除
    new_picks = []
    removed = False
    for pick in picks_data.get('picks', []):
        if pick.get('url', '').strip() == url.strip():
            print(f"  ピックアップから削除: {pick.get('title', '')[:50]}...")
            removed = True
        else:
            new_picks.append(pick)

    if not removed:
        return False

    picks_data['picks'] = new_picks

    # 5件未満なら補填
    if len(new_picks) < 5:
        print("  ピックアップ枠を補填中...")
        articles_data = load_json(ARTICLES_FILE)
        excluded_data = load_json(EXCLUDED_FILE) or {"excludedUrls": []}
        excluded_urls = set(excluded_data.get('excludedUrls', []))

        if articles_data:
            # 既にピックに含まれている記事URLを取得
            picked_urls = {p.get('url') for p in new_picks}

            # 日付順でソートした記事から補填
            sorted_articles = sorted(
                articles_data.get('articles', []),
                key=lambda x: x.get('date', ''),
                reverse=True
            )

            for article in sorted_articles:
                if len(new_picks) >= 5:
                    break
                article_url = article.get('url', '')
                if article_url not in picked_urls and article_url not in excluded_urls:
                    pick_id = hashlib.md5(f"refill-{article['id']}-{datetime.now().isoformat()}".encode()).hexdigest()[:12]
                    refill_pick = {
                        "id": pick_id,
                        "sourceArticleId": article.get('id'),
                        "title": article.get('title'),
                        "url": article_url,
                        "category": article.get('category', ''),
                        "originalDate": article.get('date', ''),
                        "reason": "最新の注目記事",
                        "summary": article.get('summary', ''),
                        "generatedAt": datetime.now().isoformat(),
                        "model": "refill"
                    }
                    new_picks.append(refill_pick)
                    picked_urls.add(article_url)
                    print(f"    補填: {article.get('title', '')[:40]}...")

    picks_data['picks'] = new_picks
    picks_data['lastUpdated'] = datetime.now().isoformat()
    picks_data['totalCount'] = len(new_picks)

    save_json(AI_PICKS_FILE, picks_data)
    print(f"  ai-picks.json: {original_count} -> {len(new_picks)} 件")

    return True


def exclude_article(url):
    """記事を永久除外する（メイン処理）"""
    print(f"\n=== 記事除外処理開始 ===")
    print(f"URL: {url}")

    # 1. ブラックリストに追加
    print("\n1. ブラックリストに追加...")
    if not add_to_blacklist(url):
        print("   → 既に登録済みまたはエラー")
    else:
        print("   → 完了")

    # 2. articles.json から削除
    print("\n2. articles.json から削除...")
    removed_articles, _ = remove_from_articles(url)
    if not removed_articles:
        print("   → 該当記事なし")

    # 3. manual-articles.json から削除
    print("\n3. manual-articles.json から削除...")
    removed_manual, _ = remove_from_manual(url)
    if not removed_manual:
        print("   → 該当記事なし")

    # 4. ai-picks.json から削除（枠補填付き）
    print("\n4. ai-picks.json から削除...")
    removed_picks = remove_from_picks_and_refill(url)
    if not removed_picks:
        print("   → 該当記事なし")

    print("\n=== 記事除外処理完了 ===")
    print(f"このURLの記事は今後表示されません: {url}")

    return True


def list_excluded():
    """ブラックリスト一覧を表示"""
    excluded_data = load_json(EXCLUDED_FILE)
    if not excluded_data or not excluded_data.get('excludedUrls'):
        print("ブラックリストは空です")
        return

    print(f"\n=== ブラックリスト一覧 ({len(excluded_data['excludedUrls'])}件) ===\n")
    for i, url in enumerate(excluded_data['excludedUrls'], 1):
        print(f"{i}. {url}")

    if excluded_data.get('lastUpdated'):
        print(f"\n最終更新: {excluded_data['lastUpdated']}")


def main():
    parser = argparse.ArgumentParser(description='記事除外スクリプト')
    parser.add_argument('--url', type=str, help='除外する記事のURL（単一）')
    parser.add_argument('--urls', type=str, nargs='+', help='除外する記事のURL（複数）')
    parser.add_argument('--stdin', action='store_true', help='標準入力からURLを読み込む（改行区切り）')
    parser.add_argument('--list', action='store_true', help='ブラックリスト一覧を表示')

    args = parser.parse_args()

    if args.list:
        list_excluded()
    elif args.stdin:
        # 標準入力から複数URLを読み込み
        urls = []
        for line in sys.stdin:
            url = line.strip()
            if url and url.startswith('http'):
                urls.append(url)

        if not urls:
            print("エラー: 有効なURLが入力されていません")
            sys.exit(1)

        print(f"\n{'='*50}")
        print(f"一括除外処理: {len(urls)}件のURL")
        print(f"{'='*50}")

        success_count = 0
        for i, url in enumerate(urls, 1):
            print(f"\n[{i}/{len(urls)}] 処理中...")
            if exclude_article(url):
                success_count += 1

        print(f"\n{'='*50}")
        print(f"一括除外完了: {success_count}/{len(urls)}件 成功")
        print(f"{'='*50}")
        sys.exit(0 if success_count == len(urls) else 1)
    elif args.urls:
        # 複数URLを引数で指定
        print(f"\n{'='*50}")
        print(f"一括除外処理: {len(args.urls)}件のURL")
        print(f"{'='*50}")

        success_count = 0
        for i, url in enumerate(args.urls, 1):
            print(f"\n[{i}/{len(args.urls)}] 処理中...")
            if exclude_article(url):
                success_count += 1

        print(f"\n{'='*50}")
        print(f"一括除外完了: {success_count}/{len(args.urls)}件 成功")
        print(f"{'='*50}")
        sys.exit(0 if success_count == len(args.urls) else 1)
    elif args.url:
        success = exclude_article(args.url)
        sys.exit(0 if success else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
