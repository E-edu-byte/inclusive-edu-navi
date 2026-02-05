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
from urllib.parse import urlparse
from collections import defaultdict
import requests
from bs4 import BeautifulSoup

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 収集対象のRSSフィード（直接取得）
RSS_FEEDS = [
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "strict_filter": False,  # 教育専門サイトなので緩めにフィルタ
    },
    {
        "name": "朝日新聞 教育",
        "url": "https://www.asahi.com/rss/asahi/edu.rdf",
        "strict_filter": False,  # 教育カテゴリなので緩めに
    },
    {
        "name": "NHK NEWS WEB",
        "url": "https://news.web.nhk/n-data/conf/na/rss/cat6.xml",
        "strict_filter": True,  # 一般ニュースなので厳格にフィルタ
    },
    {
        "name": "Yahoo!ニュース",
        "url": "https://news.yahoo.co.jp/rss/topics/domestic.xml",
        "strict_filter": True,  # 一般ニュースなので厳格にフィルタ
    },
]

# ドメインごとの最大記事数
MAX_ARTICLES_PER_DOMAIN = 5

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

# 特別支援教育関連のキーワード（フィルタリング用）- 厳格
SPECIAL_NEEDS_KEYWORDS_STRICT = [
    "特別支援", "発達障害", "インクルーシブ", "合理的配慮",
    "ユニバーサルデザイン", "個別支援", "通級", "特別支援学級",
    "自閉症", "ADHD", "LD", "学習障害", "知的障害", "肢体不自由",
    "視覚障害", "聴覚障害", "病弱", "重複障害", "医療的ケア",
    "支援教育", "特別なニーズ", "多様な学び", "バリアフリー",
    "障害児", "障がい", "療育", "放課後デイ", "個別の教育支援計画"
]

# 教育一般キーワード（緩め）
SPECIAL_NEEDS_KEYWORDS_LOOSE = [
    "教育", "学校", "文科省", "文部科学省", "GIGAスクール", "ICT教育",
    "不登校", "いじめ", "教員", "教師", "学習指導", "カリキュラム",
    "子ども", "児童", "生徒", "保護者", "先生", "授業"
]

# 出力ファイルパス
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# フォールバック画像（Unsplash - 教育関連）
FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=300&fit=crop",
]


def get_fallback_image(article_id: str) -> str:
    """記事IDに基づいてフォールバック画像を選択"""
    index = sum(ord(c) for c in article_id) % len(FALLBACK_IMAGES)
    return FALLBACK_IMAGES[index]


def get_domain(url: str) -> str:
    """URLからドメインを取得"""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""


def generate_article_id(url: str) -> str:
    """URLからユニークなIDを生成"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def parse_date(date_str) -> str:
    """日付をYYYY-MM-DD形式に変換"""
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


def is_valid_image_url(img_url: str) -> bool:
    """画像URLが有効かチェック"""
    if not img_url:
        return False

    img_url_lower = img_url.lower()

    # 明らかに不要なパターンを除外
    invalid_patterns = [
        'favicon', '1x1', 'pixel', 'spacer', 'blank.gif',
        'transparent', '/icon/', '/icons/', 'button', '/badge/',
        'logo', 'avatar', 'advertisement', '/ads/'
    ]

    for pattern in invalid_patterns:
        if pattern in img_url_lower:
            return False

    # httpで始まるURLのみ許可
    return img_url.startswith('http://') or img_url.startswith('https://')


def fetch_page_metadata(url: str, timeout: int = 15) -> dict:
    """記事ページからOGP画像と要約を取得"""
    result = {'image': None, 'description': None}

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        }
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        base_url = response.url

        def make_absolute_url(img_url: str) -> str:
            """相対URLを絶対URLに変換"""
            if not img_url:
                return ""
            if img_url.startswith('//'):
                return 'https:' + img_url
            elif img_url.startswith('/'):
                parsed = urlparse(base_url)
                return f"{parsed.scheme}://{parsed.netloc}{img_url}"
            elif not img_url.startswith('http'):
                parsed = urlparse(base_url)
                base_path = '/'.join(parsed.path.split('/')[:-1])
                return f"{parsed.scheme}://{parsed.netloc}{base_path}/{img_url}"
            return img_url

        # ① OGP画像を取得（最優先）
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = make_absolute_url(og_image['content'])
            if is_valid_image_url(img_url):
                result['image'] = img_url

        # ② Twitter Card画像
        if not result['image']:
            twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
            if not twitter_image:
                twitter_image = soup.find('meta', attrs={'name': 'twitter:image:src'})
            if twitter_image and twitter_image.get('content'):
                img_url = make_absolute_url(twitter_image['content'])
                if is_valid_image_url(img_url):
                    result['image'] = img_url

        # ③ 記事内の大きそうな画像
        if not result['image']:
            article_area = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'article|content|entry|post', re.I))
            search_area = article_area if article_area else soup

            for img in search_area.find_all('img', src=True)[:5]:
                src = img.get('src', '')
                if not src or src.startswith('data:'):
                    src = img.get('data-src', '') or img.get('data-lazy-src', '')

                if src:
                    img_url = make_absolute_url(src)
                    if is_valid_image_url(img_url):
                        result['image'] = img_url
                        break

        # 要約を取得
        og_desc = soup.find('meta', property='og:description')
        if og_desc and og_desc.get('content'):
            desc = og_desc['content'].strip()
            if len(desc) > 10:
                result['description'] = desc

        if not result['description']:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                desc = meta_desc['content'].strip()
                if len(desc) > 10:
                    result['description'] = desc

    except Exception as e:
        print(f"        [メタデータ取得エラー] {e}")

    return result


def truncate_text(text: str, max_length: int = 200) -> str:
    """テキストを指定文字数で切り詰め"""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)

    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def classify_category(title: str, summary: str) -> str:
    """タイトルと要約からカテゴリを判定"""
    text = f"{title} {summary}".lower()

    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword.lower() in text)
        scores[category] = score

    if max(scores.values()) > 0:
        return max(scores, key=scores.get)

    return "注目トピックス"


def is_special_needs_related(title: str, summary: str, strict: bool = False) -> bool:
    """特別支援教育関連の記事かどうかを判定"""
    text = f"{title} {summary}".lower()

    if strict:
        return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS_STRICT)

    # 緩いモード: 厳格キーワードまたは教育一般キーワードを含む
    return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS_STRICT + SPECIAL_NEEDS_KEYWORDS_LOOSE)


def fetch_rss_feed(feed_info: dict) -> list:
    """RSSフィードから記事を取得"""
    articles = []
    feed_name = feed_info['name']
    feed_url = feed_info['url']
    strict_filter = feed_info.get('strict_filter', False)

    try:
        print(f"  取得中: {feed_name}")
        print(f"    URL: {feed_url}")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(feed_url, headers=headers, timeout=30)
        response.raise_for_status()

        feed = feedparser.parse(response.content)

        if feed.bozo and not feed.entries:
            print(f"    警告: フィードの解析に問題がありました")
            return articles

        print(f"    {len(feed.entries)}件のエントリを取得")

        processed = 0
        for entry in feed.entries[:20]:  # 各フィードから最大20件
            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()

            if not title or not link:
                continue

            # RSS内の要約を取得
            rss_summary = entry.get('summary', '') or entry.get('description', '')
            rss_summary = truncate_text(rss_summary)

            # 特別支援教育関連かチェック
            if not is_special_needs_related(title, rss_summary, strict=strict_filter):
                continue

            processed += 1
            print(f"    [{processed}] {title[:50]}...")

            # 記事IDを生成
            article_id = generate_article_id(link)

            # 公開日を取得
            date_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            date_str = parse_date(date_parsed)

            # カテゴリを判定
            category = classify_category(title, rss_summary)

            # 記事ページからOGP画像と詳細な要約を取得
            print(f"        → ページ解析中...")
            metadata = fetch_page_metadata(link, timeout=15)

            # 画像URL
            image_url = metadata.get('image')
            if image_url:
                print(f"        → OGP画像: {image_url[:60]}...")
            else:
                image_url = get_fallback_image(article_id)
                print(f"        → フォールバック画像を使用")

            # 要約（ページのdescriptionを優先、なければRSSの要約）
            summary = metadata.get('description') or rss_summary
            if not summary:
                summary = f"{feed_name}の記事です。詳しくは元記事をご覧ください。"

            article = {
                "id": article_id,
                "title": title,
                "summary": truncate_text(summary),
                "category": category,
                "date": date_str,
                "url": link,  # 直接記事URLを保存
                "imageUrl": image_url,
                "source": feed_name
            }

            articles.append(article)

        print(f"    → {len(articles)}件の関連記事を抽出")

    except requests.exceptions.RequestException as e:
        print(f"    エラー: {feed_name}の取得に失敗 - {e}")
    except Exception as e:
        print(f"    エラー: {feed_name}の処理中にエラー - {e}")

    return articles


def apply_domain_limit(articles: list, max_per_domain: int) -> list:
    """ドメインごとの記事数を制限"""
    domain_counts = defaultdict(int)
    filtered_articles = []

    for article in articles:
        domain = get_domain(article.get('url', ''))
        if domain_counts[domain] < max_per_domain:
            filtered_articles.append(article)
            domain_counts[domain] += 1

    return filtered_articles


def save_articles(data: dict) -> None:
    """記事データをJSONファイルに保存"""
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

    all_articles = []

    # RSSフィードから収集
    print("【1】RSSフィードを取得中...")
    print("-" * 40)
    for feed_info in RSS_FEEDS:
        articles = fetch_rss_feed(feed_info)
        all_articles.extend(articles)
        print()

    # 重複除去（URLベース）
    print("【2】重複を除去中...")
    seen_urls = set()
    unique_articles = []
    for article in all_articles:
        if article['url'] not in seen_urls:
            unique_articles.append(article)
            seen_urls.add(article['url'])
    print(f"  重複除去後: {len(unique_articles)}件")

    # 日付でソート（新しい順）
    unique_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

    # ドメインごとの制限を適用
    print()
    print("【3】ドメイン制限を適用中...")
    print(f"  （各ドメイン最大{MAX_ARTICLES_PER_DOMAIN}件）")
    limited_articles = apply_domain_limit(unique_articles, MAX_ARTICLES_PER_DOMAIN)
    print(f"  制限適用後: {len(limited_articles)}件")

    # 最大50件に制限
    final_articles = limited_articles[:50]

    # ソース別の集計を表示
    print()
    print("【4】ソース別記事数:")
    print("-" * 40)
    sources = defaultdict(int)
    for article in final_articles:
        sources[article.get('source', '不明')] += 1

    for source, count in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}件")

    # カテゴリ別の集計を表示
    print()
    print("【5】カテゴリ別記事数:")
    print("-" * 40)
    categories = defaultdict(int)
    for article in final_articles:
        categories[article.get('category', '不明')] += 1

    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}件")

    # 保存データを作成
    output_data = {
        "articles": final_articles,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(final_articles),
        "sources": list(sources.keys())
    }

    # ファイルに保存
    save_articles(output_data)

    print()
    print("=" * 60)
    print(f"処理完了: 合計 {len(final_articles)}件 の記事を保存")
    print("=" * 60)


if __name__ == "__main__":
    main()
