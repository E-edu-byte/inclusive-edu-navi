#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
手動投稿スクリプト
URLを指定して記事を取得し、AI要約を生成して手動記事として追加

使用方法:
  python scripts/manual-post.py --url "https://example.com/article"
  python scripts/manual-post.py --delete "article-id"
  python scripts/manual-post.py --list
"""

import os
import sys
import json
import hashlib
import argparse
import requests
from datetime import datetime, timedelta
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

# .env.local から環境変数を読み込む
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ARTICLES_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")
MANUAL_FILE = os.path.join(PROJECT_ROOT, "public", "data", "manual-articles.json")
AI_PICKS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "ai-picks.json")

# 記事保持日数（7日）
ARTICLE_RETENTION_DAYS = 7

# Gemini API初期化
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
gemini_client = None

if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("✓ Gemini API 初期化成功")
    except Exception as e:
        print(f"警告: Gemini API初期化エラー - {e}")
else:
    print("警告: GEMINI_API_KEY が設定されていません")


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


def is_url_exists(url):
    """URLが既存記事に存在するかチェック"""
    # articles.json をチェック
    articles_data = load_json(ARTICLES_FILE)
    if articles_data:
        for article in articles_data.get('articles', []):
            if article.get('url', '').strip() == url.strip():
                return True

    # manual-articles.json をチェック
    manual_data = load_json(MANUAL_FILE)
    if manual_data:
        for article in manual_data.get('articles', []):
            if article.get('url', '').strip() == url.strip():
                return True

    return False


def fetch_article_content(url):
    """URLから記事内容を取得"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # タイトル取得
        title = None
        og_title = soup.find('meta', property='og:title')
        if og_title:
            title = og_title.get('content', '')
        if not title:
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()

        # 説明文取得
        description = None
        og_desc = soup.find('meta', property='og:description')
        if og_desc:
            description = og_desc.get('content', '')
        if not description:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                description = meta_desc.get('content', '')

        # 画像URL取得
        image_url = None
        og_image = soup.find('meta', property='og:image')
        if og_image:
            image_url = og_image.get('content', '')

        # ソース名取得
        source = urlparse(url).netloc.replace('www.', '')
        og_site = soup.find('meta', property='og:site_name')
        if og_site:
            source = og_site.get('content', '')

        # 本文取得（AI要約用）
        body_text = ""
        article_tag = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
        if article_tag:
            paragraphs = article_tag.find_all('p')
            body_text = ' '.join([p.get_text().strip() for p in paragraphs[:10]])

        return {
            'title': title or '（タイトル取得失敗）',
            'description': description or '',
            'image_url': image_url,
            'source': source,
            'body_text': body_text[:2000]  # 最大2000文字
        }

    except Exception as e:
        print(f"エラー: 記事取得失敗 - {e}")
        return None


def generate_ai_summary(title, description, body_text, source):
    """Gemini AIで要約を生成"""
    if not gemini_client:
        return None, None

    prompt = f"""あなたは「インクルーシブ教育ナビ」の要約担当です。
以下の記事情報から、保護者や教員に役立つ要約を生成してください。

【記事タイトル】
{title}

【元の説明文】
{description}

【本文抜粋】
{body_text[:1000]}

【出力形式】
以下のJSON形式で出力してください：
```json
{{
  "summary": "80〜120文字の要約（です・ます調、専門用語を避けてわかりやすく）",
  "category": "以下から1つ選択: 制度・行政 / 合理的配慮・支援 / 不登校・多様な学び / ICT・教材 / イベント・研修 / 実践・事例 / 研究 / 多様な学び",
  "mainKeyword": "記事の主要キーワード（書籍検索用、5文字以内）"
}}
```"""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        response_text = response.text

        # JSONを抽出
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()

        result = json.loads(json_str)
        return result.get('summary', ''), result.get('category', 'ICT・教材'), result.get('mainKeyword', '')

    except Exception as e:
        print(f"警告: AI要約生成エラー - {e}")
        return None, None, None


def add_manual_article(url):
    """手動記事を追加"""
    print(f"\n=== 手動投稿処理開始 ===")
    print(f"URL: {url}")

    # 重複チェック
    if is_url_exists(url):
        print("エラー: この記事は既に存在します")
        return False

    # 記事内容を取得
    print("記事内容を取得中...")
    content = fetch_article_content(url)
    if not content:
        print("エラー: 記事の取得に失敗しました")
        return False

    print(f"タイトル: {content['title']}")
    print(f"ソース: {content['source']}")

    # AI要約を生成
    print("AI要約を生成中...")
    summary, category, main_keyword = generate_ai_summary(
        content['title'],
        content['description'],
        content['body_text'],
        content['source']
    )

    if not summary:
        summary = content['description'][:150] if content['description'] else "【要約準備中】この記事の要約は現在準備中です。"
        category = "ICT・教材"
        main_keyword = ""

    print(f"要約: {summary[:50]}...")
    print(f"カテゴリ: {category}")

    # 記事IDを生成
    article_id = hashlib.md5(f"manual-{url}-{datetime.now().isoformat()}".encode()).hexdigest()[:12]

    # 画像URLの処理（フォールバック）
    image_url = content['image_url']
    if not image_url or not image_url.startswith('http'):
        fallback_images = [
            'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop',
        ]
        image_url = fallback_images[hash(content['title']) % len(fallback_images)]

    # 記事オブジェクトを作成
    new_article = {
        "id": article_id,
        "title": content['title'],
        "summary": summary,
        "category": category,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "url": url,
        "imageUrl": image_url,
        "source": content['source'],
        "mainKeyword": main_keyword or "",
        "isManual": True,
        "addedAt": datetime.now().isoformat(),
        "expiresAt": (datetime.now() + timedelta(days=ARTICLE_RETENTION_DAYS)).isoformat()
    }

    # manual-articles.json に追加
    manual_data = load_json(MANUAL_FILE) or {"articles": []}
    manual_data['articles'].insert(0, new_article)  # 先頭に追加
    manual_data['lastUpdated'] = datetime.now().isoformat()

    if save_json(MANUAL_FILE, manual_data):
        print(f"\n✓ 手動記事を追加しました: {article_id}")

        # articles.json にも追加（メイン記事一覧に表示するため）
        add_to_main_articles(new_article)

        # ai-picks.json も更新（手動記事を先頭に追加）
        update_ai_picks_with_manual(new_article)

        return True

    return False


def add_to_main_articles(manual_article):
    """手動記事をarticles.jsonの先頭に追加（メイン記事一覧に表示）"""
    articles_data = load_json(ARTICLES_FILE)
    if not articles_data:
        articles_data = {"articles": [], "lastUpdated": None}

    # 重複チェック（既に存在する場合はスキップ）
    existing_urls = {a.get('url', '') for a in articles_data.get('articles', [])}
    if manual_article['url'] in existing_urls:
        print("  → articles.json に既に存在するためスキップ")
        return

    # 先頭に追加
    articles_data['articles'].insert(0, manual_article)
    articles_data['lastUpdated'] = datetime.now().isoformat()

    if save_json(ARTICLES_FILE, articles_data):
        print(f"✓ articles.json に追加しました（メイン一覧に表示されます）")


def update_ai_picks_with_manual(manual_article):
    """手動記事をai-picks.jsonの先頭に追加"""
    picks_data = load_json(AI_PICKS_FILE)
    if not picks_data:
        picks_data = {"picks": [], "lastUpdated": None, "totalCount": 0}

    # 手動記事用のピックを作成
    pick_id = hashlib.md5(f"manual-pick-{manual_article['id']}".encode()).hexdigest()[:12]

    new_pick = {
        "id": pick_id,
        "sourceArticleId": manual_article['id'],
        "title": manual_article['title'],
        "url": manual_article['url'],
        "category": manual_article['category'],
        "originalDate": manual_article['date'],
        "reason": "編集部ピックアップ",
        "summary": manual_article['summary'],
        "generatedAt": datetime.now().isoformat(),
        "model": "manual",
        "isManual": True
    }

    # 先頭に追加
    picks_data['picks'].insert(0, new_pick)

    # 最大5件に制限（手動記事は優先保持）
    if len(picks_data['picks']) > 5:
        # 手動記事以外を削除して調整
        manual_picks = [p for p in picks_data['picks'] if p.get('isManual')]
        auto_picks = [p for p in picks_data['picks'] if not p.get('isManual')]

        # 手動記事 + 自動記事で5件まで
        remaining_slots = 5 - len(manual_picks)
        picks_data['picks'] = manual_picks + auto_picks[:max(0, remaining_slots)]

    picks_data['lastUpdated'] = datetime.now().isoformat()
    picks_data['totalCount'] = len(picks_data['picks'])

    save_json(AI_PICKS_FILE, picks_data)
    print(f"✓ ai-picks.json を更新しました（計{picks_data['totalCount']}件）")


def delete_manual_article(article_id):
    """手動記事を削除"""
    print(f"\n=== 手動記事削除処理 ===")
    print(f"記事ID: {article_id}")

    manual_data = load_json(MANUAL_FILE)
    if not manual_data:
        print("エラー: manual-articles.json が見つかりません")
        return False

    # 該当記事を検索
    found = False
    new_articles = []
    for article in manual_data.get('articles', []):
        if article.get('id') == article_id:
            found = True
            print(f"削除: {article.get('title', '')}")
        else:
            new_articles.append(article)

    if not found:
        print("エラー: 指定されたIDの記事が見つかりません")
        return False

    manual_data['articles'] = new_articles
    manual_data['lastUpdated'] = datetime.now().isoformat()

    if save_json(MANUAL_FILE, manual_data):
        print(f"✓ 手動記事を削除しました")

        # ai-picks.json から該当記事を削除し、自動記事で補填
        refill_ai_picks(article_id)

        return True

    return False


def refill_ai_picks(deleted_article_id):
    """削除された手動記事の枠を自動記事で補填"""
    picks_data = load_json(AI_PICKS_FILE)
    if not picks_data:
        return

    # 削除された記事をピックから除去
    picks_data['picks'] = [
        p for p in picks_data['picks']
        if p.get('sourceArticleId') != deleted_article_id
    ]

    # 5件未満なら自動記事から補填
    if len(picks_data['picks']) < 5:
        articles_data = load_json(ARTICLES_FILE)
        if articles_data:
            # 既にピックに含まれている記事IDを取得
            picked_ids = {p.get('sourceArticleId') for p in picks_data['picks']}

            # 日付順でソートした記事から補填
            sorted_articles = sorted(
                articles_data.get('articles', []),
                key=lambda x: x.get('date', ''),
                reverse=True
            )

            for article in sorted_articles:
                if len(picks_data['picks']) >= 5:
                    break
                if article.get('id') not in picked_ids:
                    pick_id = hashlib.md5(f"refill-{article['id']}-{datetime.now().isoformat()}".encode()).hexdigest()[:12]
                    refill_pick = {
                        "id": pick_id,
                        "sourceArticleId": article.get('id'),
                        "title": article.get('title'),
                        "url": article.get('url'),
                        "category": article.get('category', ''),
                        "originalDate": article.get('date', ''),
                        "reason": "最新の注目記事",
                        "summary": article.get('summary', ''),
                        "generatedAt": datetime.now().isoformat(),
                        "model": "refill"
                    }
                    picks_data['picks'].append(refill_pick)
                    picked_ids.add(article.get('id'))
                    print(f"✓ 補填: {article.get('title', '')[:40]}...")

    picks_data['lastUpdated'] = datetime.now().isoformat()
    picks_data['totalCount'] = len(picks_data['picks'])

    save_json(AI_PICKS_FILE, picks_data)
    print(f"✓ ai-picks.json を更新しました（計{picks_data['totalCount']}件）")


def cleanup_expired_manual_articles():
    """期限切れの手動記事を削除"""
    manual_data = load_json(MANUAL_FILE)
    if not manual_data:
        return

    now = datetime.now()
    expired_ids = []
    new_articles = []

    for article in manual_data.get('articles', []):
        expires_at = article.get('expiresAt')
        if expires_at:
            try:
                expire_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00').replace('+00:00', ''))
                if now > expire_date:
                    expired_ids.append(article.get('id'))
                    print(f"期限切れ: {article.get('title', '')[:40]}...")
                    continue
            except:
                pass
        new_articles.append(article)

    if expired_ids:
        manual_data['articles'] = new_articles
        manual_data['lastUpdated'] = now.isoformat()
        save_json(MANUAL_FILE, manual_data)

        # ai-picks.json も更新
        for article_id in expired_ids:
            refill_ai_picks(article_id)

        print(f"✓ {len(expired_ids)}件の期限切れ記事を削除しました")


def list_manual_articles():
    """手動記事一覧を表示"""
    manual_data = load_json(MANUAL_FILE)
    if not manual_data or not manual_data.get('articles'):
        print("手動投稿された記事はありません")
        return

    print(f"\n=== 手動投稿記事一覧 ({len(manual_data['articles'])}件) ===\n")

    for article in manual_data['articles']:
        expires_at = article.get('expiresAt', '')[:10]
        print(f"ID: {article.get('id')}")
        print(f"タイトル: {article.get('title')}")
        print(f"追加日: {article.get('date')} / 期限: {expires_at}")
        print(f"URL: {article.get('url')}")
        print("-" * 50)


def main():
    parser = argparse.ArgumentParser(description='手動投稿スクリプト')
    parser.add_argument('--url', type=str, help='投稿する記事のURL')
    parser.add_argument('--delete', type=str, help='削除する記事のID')
    parser.add_argument('--list', action='store_true', help='手動記事一覧を表示')
    parser.add_argument('--cleanup', action='store_true', help='期限切れ記事を削除')

    args = parser.parse_args()

    if args.cleanup:
        cleanup_expired_manual_articles()
    elif args.list:
        list_manual_articles()
    elif args.delete:
        success = delete_manual_article(args.delete)
        sys.exit(0 if success else 1)
    elif args.url:
        success = add_manual_article(args.url)
        sys.exit(0 if success else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
