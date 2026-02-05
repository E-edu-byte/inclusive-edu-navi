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
from urllib.parse import urlparse, quote, parse_qs
from collections import defaultdict
import requests
from bs4 import BeautifulSoup
import base64

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 収集対象のRSSフィード
RSS_FEEDS = [
    # 教育専門サイト
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "default_image": "/images/sources/resemom.png"
    },
    {
        "name": "EdTechZine",
        "url": "https://edtechzine.jp/rss/new/20",
        "default_image": "/images/sources/edtechzine.png"
    },
    {
        "name": "こどもとIT",
        "url": "https://edu.watch.impress.co.jp/data/rss/1.0/edu/feed.rdf",
        "default_image": "/images/sources/kodomo-it.png"
    },
    {
        "name": "教育新聞",
        "url": "https://www.kyobun.co.jp/feed/",
        "default_image": "/images/sources/kyobun.png"
    },
    # 一般ニュースサイト
    {
        "name": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "default_image": "/images/sources/nhk.png"
    },
    {
        "name": "Impress Watch",
        "url": "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf",
        "default_image": "/images/sources/impress.png"
    },
]

# Googleニュース検索RSS（キーワード別）
GOOGLE_NEWS_KEYWORDS = [
    "インクルーシブ教育",
    "特別支援教育",
    "合理的配慮",
    "発達障害 学校",
    "通級指導",
]

# ドメインごとの最大記事数
MAX_ARTICLES_PER_DOMAIN = 3

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

# 特別支援教育関連のキーワード（フィルタリング用）- より厳格に
SPECIAL_NEEDS_KEYWORDS_STRICT = [
    # 特別支援教育の中核キーワード（必須）
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
    "不登校", "いじめ", "教員", "教師", "学習指導", "カリキュラム"
]

# 出力ファイルパス
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# デフォルト画像（空文字列にしてフロントエンドでプレースホルダー表示）
DEFAULT_IMAGE = ""

# カテゴリ別のフォールバック画像（Unsplash - 教育関連のフリー写真）
FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop",  # 教室
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop",  # 学習
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop",  # 子供と本
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop",  # 子供たち
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop",  # 本と鉛筆
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=300&fit=crop",  # 学校
]


def get_fallback_image(article_id: str) -> str:
    """記事IDに基づいてフォールバック画像を選択（一貫性のため）"""
    # 記事IDのハッシュ値から画像を選択
    index = sum(ord(c) for c in article_id) % len(FALLBACK_IMAGES)
    return FALLBACK_IMAGES[index]


def decode_google_news_url(google_url: str) -> Optional[str]:
    """GoogleニュースのURLから実際の記事URLをBase64デコードで抽出"""
    try:
        if 'news.google.com' not in google_url:
            return google_url

        # URLからarticle IDを抽出
        parsed = urlparse(google_url)
        path_parts = parsed.path.split('/')

        article_id = None
        for i, part in enumerate(path_parts):
            if part == 'articles' and i + 1 < len(path_parts):
                article_id = path_parts[i + 1]
                break

        if not article_id:
            return None

        # クエリパラメータを除去
        article_id = article_id.split('?')[0]

        # Base64デコードを試みる（複数の方法を試す）
        for padding in ['', '=', '==', '===']:
            try:
                padded = article_id + padding
                decoded = base64.urlsafe_b64decode(padded)
                decoded_str = decoded.decode('utf-8', errors='ignore')

                # URLパターンを探す
                url_match = re.search(r'https?://[^\s\x00-\x1f"<>]+', decoded_str)
                if url_match:
                    actual_url = url_match.group(0)
                    # 末尾の不要な文字を除去
                    actual_url = re.sub(r'[\x00-\x1f]+.*$', '', actual_url)
                    if len(actual_url) > 20 and '.' in actual_url:
                        return actual_url
            except Exception:
                continue

        return None
    except Exception:
        return None


def resolve_google_news_url(google_url: str, headers: dict, timeout: int = 10) -> Optional[str]:
    """GoogleニュースのURLから実際の記事URLを取得"""
    # まずBase64デコードを試みる
    decoded_url = decode_google_news_url(google_url)
    if decoded_url:
        return decoded_url

    # デコードが失敗した場合はHTTPリダイレクト追跡
    try:
        response = requests.get(google_url, headers=headers, timeout=timeout, allow_redirects=True)
        final_url = response.url

        if 'news.google.com' not in final_url and 'google.com' not in final_url:
            return final_url

        # HTMLからリダイレクト先を探す
        soup = BeautifulSoup(response.content, 'html.parser')

        # data-urlを探す
        for tag in soup.find_all(attrs={'data-url': True}):
            url = tag['data-url']
            if url and 'http' in url:
                return url

        # canonical linkを探す
        canonical = soup.find('link', rel='canonical')
        if canonical and canonical.get('href'):
            href = canonical['href']
            if 'news.google.com' not in href:
                return href

        return None
    except Exception:
        return None


def is_valid_article_image(img_url: str) -> bool:
    """画像URLが有効な記事画像かチェック（明らかに不要なものだけ除外）"""
    if not img_url:
        return False

    img_url_lower = img_url.lower()

    # 明らかに除外すべき小さなアイコン系のみ除外
    invalid_patterns = [
        'favicon',
        '1x1',
        'pixel',
        'spacer',
        'blank.gif',
        'transparent.gif',
        '/icon/',
        '/icons/',
        'button',
        '/badge/',
    ]

    for pattern in invalid_patterns:
        if pattern in img_url_lower:
            return False

    # httpで始まるURLなら基本的にOK
    if img_url.startswith('http://') or img_url.startswith('https://'):
        return True

    return False


def fetch_page_metadata(url: str, timeout: int = 10) -> dict:
    """URLからOGP画像と要約（description）を取得

    優先順位:
    ① meta property="og:image"（SNSで表示される画像）
    ② meta name="twitter:image"
    ③ 記事内の大きな画像
    """
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
        base_url = response.url  # リダイレクト後の実際のURL

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

        # ① OGP画像を探す（最優先）
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = make_absolute_url(og_image['content'])
            if is_valid_article_image(img_url):
                result['image'] = img_url
                print(f"        [OGP画像発見] {img_url[:60]}...")

        # ② Twitter Card画像を探す
        if not result['image']:
            twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
            if not twitter_image:
                twitter_image = soup.find('meta', attrs={'name': 'twitter:image:src'})
            if twitter_image and twitter_image.get('content'):
                img_url = make_absolute_url(twitter_image['content'])
                if is_valid_article_image(img_url):
                    result['image'] = img_url
                    print(f"        [Twitter画像発見] {img_url[:60]}...")

        # ③ 記事内の大きそうな画像を探す
        if not result['image']:
            # 記事の本文エリアを探す
            article_area = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'article|content|entry|post', re.I))
            search_area = article_area if article_area else soup

            for img in search_area.find_all('img', src=True):
                src = img.get('src', '')
                # data-src属性も確認（遅延読み込み対応）
                if not src or src.startswith('data:'):
                    src = img.get('data-src', '') or img.get('data-lazy-src', '') or img.get('data-original', '')

                if not src:
                    continue

                img_url = make_absolute_url(src)
                if is_valid_article_image(img_url):
                    # 幅・高さの属性があればサイズをチェック
                    width = img.get('width', '')
                    height = img.get('height', '')
                    try:
                        w = int(re.sub(r'[^\d]', '', str(width))) if width else 0
                        h = int(re.sub(r'[^\d]', '', str(height))) if height else 0
                        # 小さすぎる画像はスキップ
                        if (w > 0 and w < 100) or (h > 0 and h < 100):
                            continue
                    except ValueError:
                        pass

                    result['image'] = img_url
                    print(f"        [記事内画像発見] {img_url[:60]}...")
                    break

        # 要約（description）を取得
        # og:description を優先
        og_desc = soup.find('meta', property='og:description')
        if og_desc and og_desc.get('content'):
            desc = og_desc['content'].strip()
            if len(desc) > 10:
                result['description'] = desc

        if not result['description']:
            # 通常の meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                desc = meta_desc['content'].strip()
                if len(desc) > 10:
                    result['description'] = desc

    except Exception as e:
        print(f"        [メタデータ取得エラー] {e}")

    return result


def fetch_ogp_image(url: str, timeout: int = 10) -> Optional[str]:
    """URLからOGP画像を取得（後方互換性のため維持）"""
    metadata = fetch_page_metadata(url, timeout)
    return metadata.get('image')


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


def extract_image_url(entry: dict, feed_info: dict, category: str = "注目トピックス") -> str:
    """記事からサムネイル画像URLを抽出"""
    # media:content から取得
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('type', '').startswith('image'):
                url = media.get('url', '')
                if url and is_valid_article_image(url):
                    return url

    # media:thumbnail から取得
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        url = entry.media_thumbnail[0].get('url', '')
        if url and is_valid_article_image(url):
            return url

    # enclosure から取得
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                url = enc.get('href', '')
                if url and is_valid_article_image(url):
                    return url

    # content内のimg要素から取得
    content = entry.get('content', [{}])[0].get('value', '') if entry.get('content') else ''
    if not content:
        content = entry.get('summary', '')

    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
    if img_match:
        url = img_match.group(1)
        if url and url.startswith('http') and is_valid_article_image(url):
            return url

    # 記事ページからOGP画像を取得を試みる
    link = entry.get('link', '')
    if link:
        ogp_image = fetch_ogp_image(link, timeout=5)
        if ogp_image and is_valid_article_image(ogp_image):
            return ogp_image

    # 画像が取得できない場合はフォールバック画像
    # entry.get('link')からIDを生成してフォールバック画像を選択
    link = entry.get('link', '')
    if link:
        article_id = generate_article_id(link)
        return get_fallback_image(article_id)

    return DEFAULT_IMAGE


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


def is_special_needs_related(title: str, summary: str, source_name: str, strict: bool = False) -> bool:
    """特別支援教育関連の記事かどうかを判定"""
    text = f"{title} {summary}".lower()

    # 厳格モード: 中核キーワードのみ
    if strict:
        return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS_STRICT)

    # 緩いモード: 教育専門サイトはすべて関連とみなす
    if source_name in ["文部科学省", "国立特別支援教育総合研究所", "EdTechZine", "こどもとIT", "教育新聞"]:
        return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS_STRICT + SPECIAL_NEEDS_KEYWORDS_LOOSE)

    # それ以外は中核キーワードで判定
    return any(keyword.lower() in text for keyword in SPECIAL_NEEDS_KEYWORDS_STRICT)


def fetch_feed(feed_info: dict, strict_filter: bool = False) -> list:
    """RSSフィードを取得して記事リストを返す"""
    articles = []

    try:
        print(f"  取得中: {feed_info['name']}")

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
            if not is_special_needs_related(title, summary, feed_info['name'], strict=strict_filter):
                continue

            # 公開日を取得
            date_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            date_str = parse_date(date_parsed)

            # カテゴリを判定（画像取得より先に）
            category = classify_category(title, summary)

            # 画像URLを取得（カテゴリを渡してフォールバック画像に使用）
            image_url = extract_image_url(entry, feed_info, category)

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

        print(f"    → {len(articles)}件の関連記事を抽出")

    except requests.exceptions.RequestException as e:
        print(f"    エラー: {feed_info['name']}の取得に失敗 - {e}")
    except Exception as e:
        print(f"    エラー: {feed_info['name']}の処理中にエラー - {e}")

    return articles


def fetch_google_news(keyword: str) -> list:
    """GoogleニュースRSSから記事を取得"""
    articles = []

    try:
        encoded_keyword = quote(keyword)
        url = f"https://news.google.com/rss/search?q={encoded_keyword}&hl=ja&gl=JP&ceid=JP:ja"

        print(f"  取得中: Googleニュース「{keyword}」")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        feed = feedparser.parse(response.content)

        if feed.bozo and not feed.entries:
            print(f"    警告: Googleニュースフィードの解析に問題がありました")
            return articles

        print(f"    {len(feed.entries)}件のエントリを取得")

        for entry in feed.entries[:10]:  # 各キーワードから最大10件
            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()

            if not title or not link:
                continue

            # Googleニュースのソース名を抽出（タイトルから）
            source_match = re.search(r' - ([^-]+)$', title)
            source_name = source_match.group(1).strip() if source_match else "Googleニュース"
            # タイトルからソース名を除去
            clean_title = re.sub(r' - [^-]+$', '', title).strip()

            # 公開日を取得
            date_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            date_str = parse_date(date_parsed)

            # カテゴリを判定
            category = classify_category(clean_title, "")

            # 実際の記事ページからOGP画像と要約を取得
            image_url = None
            summary = ""

            # GoogleニュースのURLから実際のURLを解決
            actual_url = resolve_google_news_url(link, headers, timeout=10)
            if actual_url:
                print(f"      → 実際のURL: {actual_url[:70]}...")
                try:
                    # ページからメタデータを取得
                    metadata = fetch_page_metadata(actual_url, timeout=10)
                    image_url = metadata.get('image')
                    page_description = metadata.get('description')

                    # 要約を設定（ページのdescriptionを優先）
                    if page_description and len(page_description) > 20:
                        # 英語のデフォルトメッセージを除外
                        if 'Comprehensive up-to-date news' not in page_description:
                            summary = truncate_text(page_description)

                    # 画像URLが有効かチェック
                    if image_url and not is_valid_article_image(image_url):
                        image_url = None

                except Exception as e:
                    print(f"      → メタデータ取得失敗: {e}")
            else:
                print(f"      → URL解決失敗")

            # 要約がなければタイトルから生成
            if not summary:
                # タイトルから適切な要約を生成
                if len(clean_title) > 30:
                    summary = f"{clean_title}。{source_name}より。"
                else:
                    summary = f"{source_name}より。{clean_title}についての記事です。詳しくは元記事をご覧ください。"

            # 記事IDを生成
            article_id = generate_article_id(link)

            # 画像が取得できなかった場合はフォールバック画像を使用
            if not image_url or not is_valid_article_image(image_url):
                image_url = get_fallback_image(article_id)
                print(f"      → フォールバック画像を使用")

            article = {
                "id": article_id,
                "title": clean_title,
                "summary": summary,
                "category": category,
                "date": date_str,
                "url": link,
                "imageUrl": image_url,
                "source": source_name
            }

            articles.append(article)

        print(f"    → {len(articles)}件の記事を抽出")

    except Exception as e:
        print(f"    エラー: Googleニュース「{keyword}」の取得に失敗 - {e}")

    return articles


def apply_domain_limit(articles: list, max_per_domain: int = MAX_ARTICLES_PER_DOMAIN) -> list:
    """ドメインごとの記事数を制限"""
    domain_counts = defaultdict(int)
    filtered_articles = []

    for article in articles:
        domain = get_domain(article.get('url', ''))
        if domain_counts[domain] < max_per_domain:
            filtered_articles.append(article)
            domain_counts[domain] += 1

    return filtered_articles


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
    print("特別支援教育ニュース収集システム（強化版）")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    all_new_articles = []

    # 1. 通常のRSSフィードから収集
    print("【1】RSSフィードを取得中...")
    print("-" * 40)
    for feed_info in RSS_FEEDS:
        articles = fetch_feed(feed_info, strict_filter=False)
        all_new_articles.extend(articles)

    print()

    # 2. GoogleニュースRSSから収集
    print("【2】Googleニュースを取得中...")
    print("-" * 40)
    for keyword in GOOGLE_NEWS_KEYWORDS:
        articles = fetch_google_news(keyword)
        all_new_articles.extend(articles)

    print()

    # 3. 重複除去（URLベース）
    print("【3】重複を除去中...")
    seen_urls = set()
    unique_articles = []
    for article in all_new_articles:
        if article['url'] not in seen_urls:
            unique_articles.append(article)
            seen_urls.add(article['url'])
    print(f"  重複除去後: {len(unique_articles)}件")

    # 4. 日付でソート（新しい順）
    unique_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

    # 5. ドメインごとの制限を適用
    print()
    print("【4】ドメイン制限を適用中...")
    print(f"  （各ドメイン最大{MAX_ARTICLES_PER_DOMAIN}件）")
    limited_articles = apply_domain_limit(unique_articles, MAX_ARTICLES_PER_DOMAIN)
    print(f"  制限適用後: {len(limited_articles)}件")

    # 6. 最大100件に制限（新しいデータで上書き）
    final_articles = limited_articles[:100]

    # 7. ソース別の集計を表示
    print()
    print("【5】ソース別記事数:")
    print("-" * 40)
    sources = defaultdict(int)
    for article in final_articles:
        sources[article.get('source', '不明')] += 1

    for source, count in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}件")

    # 8. カテゴリ別の集計を表示
    print()
    print("【6】カテゴリ別記事数:")
    print("-" * 40)
    categories = defaultdict(int)
    for article in final_articles:
        categories[article.get('category', '不明')] += 1

    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}件")

    # 9. 保存データを作成
    output_data = {
        "articles": final_articles,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(final_articles),
        "sources": list(sources.keys())
    }

    # 10. ファイルに保存
    save_articles(output_data)

    print()
    print("=" * 60)
    print(f"処理完了: 合計 {len(final_articles)}件 の記事を保存")
    print("=" * 60)


if __name__ == "__main__":
    main()
