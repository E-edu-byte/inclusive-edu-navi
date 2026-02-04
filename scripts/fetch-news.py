#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
特別支援教育関連ニュース自動収集スクリプト
RSSフィードから記事を取得し、カテゴリ分類してJSON形式で保存
"""

import feedparser
import json
import os
import re
import hashlib
import sys
import io
from datetime import datetime
from typing import Optional
import requests
from urllib.parse import urljoin

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 収集対象のRSSフィード
RSS_FEEDS = [
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "default_image": "/images/sources/resemom.png"
    },
    {
        "name": "Impress Watch",
        "url": "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf",
        "default_image": "/images/sources/impress.png"
    },
    {
        "name": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "default_image": "/images/sources/nhk.png"
    }
]

# カテゴリ分類のキーワード
CATEGORY_KEYWORDS = {
    "制度・法改正": [
        "文科省", "文部科学省", "法律", "法改正", "ガイドライン", "制度",
        "通知", "告示", "省令", "政策", "答申", "報告書", "指針", "基準"
    ],
    "研究・学術": [
        "研究", "調査", "大学", "学会", "論文", "分析", "統計",
        "エビデンス", "実証", "検証", "学術", "科研", "博士", "教授"
    ],
    "実践・事例": [
        "実践", "事例", "取り組み", "小学校", "中学校", "高校", "高等学校",
        "学級", "授業", "指導", "支援", "児童", "生徒", "教員", "先生"
    ],
    "教材・ツール": [
        "教材", "ツール", "アプリ", "ICT", "タブレット", "デジタル",
        "ソフト", "システム", "機器", "支援技術", "AT", "アシスティブ"
    ],
    "イベント・研修": [
        "セミナー", "研修", "イベント", "講座", "ワークショップ", "シンポジウム",
        "フォーラム", "大会", "募集", "開催", "参加", "申込"
    ]
}

# 特別支援教育関連のキーワード（フィルタリング用）
SPECIAL_NEEDS_KEYWORDS = [
    # 特別支援教育の中核キーワード
    "特別支援", "発達障害", "障害", "インクルーシブ", "合理的配慮",
    "ユニバーサルデザイン", "個別支援", "通級", "特別支援学級",
    "自閉症", "ADHD", "LD", "学習障害", "知的障害", "肢体不自由",
    "視覚障害", "聴覚障害", "病弱", "重複障害", "医療的ケア",
    "支援教育", "特別なニーズ", "多様な学び", "バリアフリー",
    # 教育一般キーワード（教育ニュースサイト用）
    "教育", "学校", "文科省", "文部科学省", "GIGAスクール", "ICT教育",
    "不登校", "いじめ", "教員", "教師", "学習指導", "カリキュラム",
    "プログラミング教育", "英語教育", "道徳", "探究学習", "アクティブラーニング"
]

# 出力ファイルパス
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# デフォルト画像
DEFAULT_IMAGE = "/images/default-article.png"


def generate_article_id(url: str) -> str:
    """URLからユニークなIDを生成"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def parse_date(date_str: str) -> Optional[str]:
    """日付文字列をYYYY-MM-DD形式に変換"""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    # feedparserが解析した日付構造体を処理
    try:
        if hasattr(date_str, 'tm_year'):
            return f"{date_str.tm_year:04d}-{date_str.tm_mon:02d}-{date_str.tm_mday:02d}"
    except Exception:
        pass

    # 文字列として処理
    date_formats = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y/%m/%d",
    ]

    for fmt in date_formats:
        try:
            dt = datetime.strptime(str(date_str), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return datetime.now().strftime("%Y-%m-%d")


def extract_image_url(entry: dict, feed_info: dict) -> str:
    """記事からサムネイル画像URLを抽出"""
    # media:content から取得
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('type', '').startswith('image'):
                return media.get('url', '')

    # media:thumbnail から取得
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        return entry.media_thumbnail[0].get('url', '')

    # enclosure から取得
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                return enc.get('href', '')

    # content内のimg要素から取得
    content = entry.get('content', [{}])[0].get('value', '') if entry.get('content') else ''
    if not content:
        content = entry.get('summary', '')

    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
    if img_match:
        return img_match.group(1)

    # デフォルト画像を返す
    return feed_info.get('default_image', DEFAULT_IMAGE)


def truncate_text(text: str, max_length: int = 200) -> str:
    """テキストを指定文字数で切り詰め"""
    # HTMLタグを除去
    text = re.sub(r'<[^>]+>', '', text)
    # 余分な空白を整理
    text = re.sub(r'\s+', ' ', text).strip()

    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def classify_category(title: str, summary: str) -> str:
    """タイトルと要約からカテゴリを判定"""
    text = f"{title} {summary}".lower()

    # 各カテゴリのスコアを計算
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword.lower() in text)
        scores[category] = score

    # 最高スコアのカテゴリを返す
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)

    return "注目トピックス"


def is_special_needs_related(title: str, summary: str, source_name: str) -> bool:
    """特別支援教育関連の記事かどうかを判定"""
    # 教育専門サイトはすべて関連とみなす（フィルタリングは緩めに）
    if source_name in ["文部科学省", "国立特別支援教育総合研究所", "EdTechZine", "こどもとIT"]:
        return True

    text = f"{title} {summary}".lower()
    return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS)


def fetch_feed(feed_info: dict) -> list:
    """RSSフィードを取得して記事リストを返す"""
    articles = []

    try:
        print(f"  取得中: {feed_info['name']} ({feed_info['url']})")

        # User-Agentを設定してリクエスト
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(feed_info['url'], headers=headers, timeout=30)
        response.raise_for_status()

        # feedparserで解析
        feed = feedparser.parse(response.content)

        if feed.bozo and not feed.entries:
            print(f"    警告: フィードの解析に問題がありました - {feed_info['name']}")
            return articles

        print(f"    {len(feed.entries)}件のエントリを取得")

        for entry in feed.entries:
            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()

            if not title or not link:
                continue

            # 要約を取得
            summary = entry.get('summary', '') or entry.get('description', '')
            summary = truncate_text(summary)

            # 特別支援教育関連かチェック
            if not is_special_needs_related(title, summary, feed_info['name']):
                continue

            # 公開日を取得
            date_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            date_str = parse_date(date_parsed)

            # 画像URLを取得
            image_url = extract_image_url(entry, feed_info)

            # カテゴリを判定
            category = classify_category(title, summary)

            article = {
                "id": generate_article_id(link),
                "title": title,
                "summary": summary if summary else f"{feed_info['name']}からの記事です。",
                "category": category,
                "date": date_str,
                "url": link,
                "imageUrl": image_url,
                "source": feed_info['name']
            }

            articles.append(article)

        print(f"    {len(articles)}件の関連記事を抽出")

    except requests.exceptions.RequestException as e:
        print(f"    エラー: {feed_info['name']}の取得に失敗 - {e}")
    except Exception as e:
        print(f"    エラー: {feed_info['name']}の処理中にエラー - {e}")

    return articles


def load_existing_articles() -> dict:
    """既存の記事データを読み込む"""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    return {"articles": [], "lastUpdated": None}


def save_articles(data: dict) -> None:
    """記事データをJSONファイルに保存"""
    # ディレクトリが存在しない場合は作成
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n保存完了: {OUTPUT_FILE}")


def main():
    """メイン処理"""
    print("=" * 60)
    print("特別支援教育ニュース収集システム")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 既存データを読み込む
    existing_data = load_existing_articles()
    existing_urls = {article['url'] for article in existing_data.get('articles', [])}
    print(f"既存記事数: {len(existing_urls)}件")
    print()

    # 各フィードから記事を収集
    print("RSSフィードを取得中...")
    new_articles = []

    for feed_info in RSS_FEEDS:
        articles = fetch_feed(feed_info)
        for article in articles:
            if article['url'] not in existing_urls:
                new_articles.append(article)
                existing_urls.add(article['url'])

    print()
    print(f"新規記事数: {len(new_articles)}件")

    # 既存記事と新規記事をマージ
    all_articles = new_articles + existing_data.get('articles', [])

    # 日付でソート（新しい順）
    all_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

    # 最大500件に制限
    all_articles = all_articles[:500]

    # 保存データを作成
    output_data = {
        "articles": all_articles,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(all_articles),
        "sources": [feed['name'] for feed in RSS_FEEDS]
    }

    # ファイルに保存
    save_articles(output_data)

    # カテゴリ別の集計を表示
    print()
    print("カテゴリ別記事数:")
    categories = {}
    for article in all_articles:
        cat = article.get('category', '不明')
        categories[cat] = categories.get(cat, 0) + 1

    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}件")

    print()
    print("=" * 60)
    print("処理完了")
    print("=" * 60)


if __name__ == "__main__":
    main()
