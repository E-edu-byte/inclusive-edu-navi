#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
特別支援教育関連ニュース自動収集スクリプト
RSSフィードから記事を取得し、理念に基づくキーワードフィルタリングを適用
全記事にGemini AIによる優しい要約を付与
"""

import feedparser
import json
import os
import re
import hashlib
import sys
import io
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urljoin
from collections import defaultdict
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# .env.local から環境変数を読み込む
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

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
    print("警告: GEMINI_API_KEY が設定されていません（AI要約は無効）")

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ========================================
# 収集対象のRSSフィード（拡張版）
# ========================================
RSS_FEEDS = [
    # 教育専門メディア（理念フィルタなしで全記事採用）
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "skip_core_filter": True,  # 教育専門サイトなので理念フィルタをスキップ
    },
    {
        "name": "ICT教育ニュース",
        "url": "https://ict-enews.net/feed/",
        "skip_core_filter": True,
    },
    {
        "name": "みんなの教育技術",
        "url": "https://kyoiku.sho.jp/feed/",
        "skip_core_filter": True,
    },
    {
        "name": "EdTechZine",
        "url": "https://edtechzine.jp/rss/new/",
        "skip_core_filter": True,
    },
    # 大手メディア教育カテゴリ（理念フィルタ適用）
    {
        "name": "朝日新聞 教育",
        "url": "https://www.asahi.com/rss/asahi/edu.rdf",
        "skip_core_filter": False,
    },
    {
        "name": "東洋経済オンライン",
        "url": "https://toyokeizai.net/list/feed/rss",
        "skip_core_filter": False,
    },
    # 通信社・放送局（厳格にフィルタ）
    {
        "name": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "skip_core_filter": False,
    },
    {
        "name": "Yahoo!ニュース 国内",
        "url": "https://news.yahoo.co.jp/rss/topics/domestic.xml",
        "skip_core_filter": False,
    },
]

# ドメインごとの最大記事数
MAX_ARTICLES_PER_DOMAIN = 5

# ========================================
# 理念に基づくキーワードフィルタリング
# ========================================

# 【重要】理念キーワード - これらのいずれかを含む記事のみを採用
CORE_KEYWORDS = [
    "特別支援", "インクルーシブ", "障害", "障がい", "ギフテッド",
    "不登校", "ICT", "タブレット", "EdTech", "発達",
    "療育", "合理的配慮", "ユニバーサルデザイン", "UDL",
    "学習障害", "LD", "ADHD", "自閉症", "ASD",
    "通級", "支援学級", "支援学校", "医療的ケア",
    "個別支援", "個別の教育支援計画", "IEP",
    "読み書き困難", "ディスレクシア", "多様な学び"
]

# 除外キーワード（広告・PR記事をスキップ）
EXCLUDE_KEYWORDS = [
    "PR", "広告", "プレゼント", "キャンペーン", "セミナー申込",
    "応募締切", "抽選で", "モニター募集", "スポンサー",
    "[PR]", "【PR】", "【広告】", "[AD]"
]

# 細かすぎる実践情報の除外キーワード（教員向けテクニック）
PRACTICE_EXCLUDE_KEYWORDS = [
    "板書", "指導案", "学級開き", "学級づくり", "授業開き",
    "ワークシート", "プリント", "時短学習", "京女式",
    "〇年国語", "〇年算数", "小１国語", "小２国語", "小３国語",
    "小４国語", "小５国語", "小６国語", "小1国語", "小2国語",
    "小3国語", "小4国語", "小5国語", "小6国語",
    "教員採用試験", "教採", "採用試験対策", "面接対策"
]

# マニアックな技術解説記事の除外キーワード
TECH_EXCLUDE_KEYWORDS = [
    "Scratch", "スクラッチ", "プログラミング解説", "共通テスト解説",
    "共テ", "Vol.", "Vol.1", "Vol.2", "Vol.3", "Vol.4", "Vol.5",
    "コーディング入門", "Python入門", "JavaScript入門"
]

# 一般の受験情報の除外キーワード（特別支援・合理的配慮がない場合のみ除外）
EXAM_EXCLUDE_KEYWORDS = [
    "特別選抜", "出願状況", "倍率", "合格発表", "高校受験", "高校入試",
    "入試解答", "確定志願者", "志願状況", "中学受験", "大学受験",
    "共通テスト", "入学者選抜", "募集人員", "入試情報", "出願",
    "入試直前", "入試本番", "受験勉強", "受験生", "受験対策",
    "大学ランキング", "就職率ランキング", "人気ランキング", "偏差値",
    "合格者数", "合格実績", "進学実績", "国公立大", "難関大",
    "センター試験", "二次試験", "前期試験", "後期試験", "推薦入試"
]

# 受験情報の例外キーワード（これらがあれば除外しない）
EXAM_EXCEPTION_KEYWORDS = [
    "特別支援", "合理的配慮", "インクルーシブ", "不登校",
    "障害", "障がい", "配慮事項", "支援学校", "支援学級"
]

# 小規模イベント検出キーワード
EVENT_KEYWORDS = [
    "セミナー", "研修", "講座", "開催", "募集", "ワークショップ",
    "オンライン講座", "参加者募集", "申込", "フォーラム"
]

# 公的機関キーワード（イベント記事の例外許可）
PUBLIC_INSTITUTION_KEYWORDS = [
    "文部科学省", "文科省", "OECD", "ユネスコ", "UNESCO",
    "教育委員会", "内閣府", "厚生労働省", "総務省",
    "国立", "都道府県", "市区町村", "自治体",
    "東京大学", "京都大学", "大阪大学", "名古屋大学",
    "東北大学", "九州大学", "北海道大学", "筑波大学",
    "早稲田大学", "慶應義塾大学", "上智大学"
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
        "フォーラム", "大会", "募集", "開催", "参加"
    ]
}

# 出力ファイルパス
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# 【キャッシュ】既存のarticles.jsonから要約を再利用
SUMMARY_CACHE = {}
FAILED_SUMMARIES = []  # AI要約に失敗した記事をトラッキング

def is_ai_generated_summary(summary: str) -> bool:
    """要約がAI生成かどうかを判定（です・ます調で終わっているか）"""
    if not summary:
        return False
    # AI要約の特徴: です・ます調で終わる、[…]や...で終わらない
    ai_endings = ['です。', 'ます。', 'ますね。', 'ますよ。', 'ください。', 'しょう。']
    non_ai_patterns = ['[…]', '…', '...', '［…］', ' - ', '【', '】']

    # 非AI要約のパターンを含む場合はFalse
    for pattern in non_ai_patterns:
        if pattern in summary[-20:]:
            return False

    # AI要約の終わり方をしている場合はTrue
    for ending in ai_endings:
        if summary.endswith(ending):
            return True

    return False

def load_summary_cache():
    """既存のarticles.jsonからAI要約済みの要約をキャッシュに読み込む"""
    global SUMMARY_CACHE
    try:
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for article in data.get('articles', []):
                    url = article.get('url', '')
                    summary = article.get('summary', '')
                    # 有効なAI要約（80文字以上かつAI生成の特徴を持つ）のみキャッシュ
                    if url and summary and len(summary) > 60 and is_ai_generated_summary(summary):
                        SUMMARY_CACHE[url] = summary
            print(f"✓ キャッシュ読み込み: {len(SUMMARY_CACHE)}件の既存AI要約を再利用可能")
    except Exception as e:
        print(f"警告: キャッシュ読み込みエラー - {e}")

# ========================================
# フォールバック画像（Unsplash - 教育関連）
# 【鉄壁ルール】画像が取得できない場合は必ずこれを使用
# ========================================
FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=300&fit=crop",
]


def get_fallback_image(article_id: str) -> str:
    """記事IDに基づいてフォールバック画像を選択（必ず画像を返す）"""
    index = sum(ord(c) for c in article_id) % len(FALLBACK_IMAGES)
    return FALLBACK_IMAGES[index]


def get_domain(url: str) -> str:
    """URLからドメインを取得"""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""


def get_base_url(url: str) -> str:
    """URLからベースURL（スキーム+ホスト）を取得"""
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"
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


def make_absolute_url(img_url: str, base_url: str) -> str:
    """
    【鉄壁ルール】相対URLを絶対URLに変換
    - 「/」で始まる相対パスをhttps://...の絶対URLに変換
    - 「//」で始まるプロトコル相対URLにhttps:を付与
    """
    if not img_url:
        return ""

    img_url = img_url.strip()

    # 既に絶対URLの場合はそのまま返す
    if img_url.startswith('http://') or img_url.startswith('https://'):
        return img_url

    # プロトコル相対URL（//で始まる）
    if img_url.startswith('//'):
        return 'https:' + img_url

    # 相対パス（/で始まる）→ ベースURLと結合
    if img_url.startswith('/'):
        return urljoin(base_url, img_url)

    # その他の相対パス
    return urljoin(base_url, img_url)


def is_valid_image_url(img_url: str) -> bool:
    """画像URLが有効かチェック"""
    if not img_url:
        return False

    img_url_lower = img_url.lower()

    # 明らかに不要なパターンを除外
    invalid_patterns = [
        'favicon', '1x1', 'pixel', 'spacer', 'blank.gif',
        'transparent', '/icon/', '/icons/', 'button', '/badge/',
        'logo', 'avatar', 'advertisement', '/ads/', 'tracking',
        'beacon', 'analytics', '.svg', 'placeholder'
    ]

    for pattern in invalid_patterns:
        if pattern in img_url_lower:
            return False

    # httpで始まるURLのみ許可
    return img_url.startswith('http://') or img_url.startswith('https://')


def fetch_page_metadata(url: str, timeout: int = 15) -> dict:
    """
    記事ページからOGP画像と要約を取得
    【鉄壁ルール】相対パスは絶対URLに変換
    【朝日新聞対策】特殊なヘッダー設定で確実に取得
    """
    result = {'image': None, 'description': None}
    base_url = get_base_url(url)
    domain = get_domain(url)

    try:
        # 【朝日新聞対策】より本格的なブラウザを模倣
        if 'asahi.com' in domain:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
            }
        else:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            }

        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        # リダイレクト後のURLからベースURLを再取得
        final_base_url = get_base_url(response.url)

        # ① OGP画像を取得（最優先）
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = make_absolute_url(og_image['content'], final_base_url)
            if is_valid_image_url(img_url):
                result['image'] = img_url
                print(f"        → OGP画像取得成功")

        # ② Twitter Card画像
        if not result['image']:
            twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
            if not twitter_image:
                twitter_image = soup.find('meta', attrs={'name': 'twitter:image:src'})
            if twitter_image and twitter_image.get('content'):
                img_url = make_absolute_url(twitter_image['content'], final_base_url)
                if is_valid_image_url(img_url):
                    result['image'] = img_url
                    print(f"        → Twitter画像取得成功")

        # 【朝日新聞対策】③ 朝日新聞専用の画像パターン
        if not result['image'] and 'asahi.com' in domain:
            # 朝日新聞のimgopt URLパターンから画像を探す
            for meta in soup.find_all('meta'):
                content = meta.get('content', '')
                if 'imgopt.asahi.com' in content or 'www.asahicom.jp' in content:
                    if is_valid_image_url(content):
                        result['image'] = content
                        print(f"        → 朝日新聞専用パターンで画像取得")
                        break

            # JSON-LDからも探す
            if not result['image']:
                for script in soup.find_all('script', type='application/ld+json'):
                    try:
                        import json
                        data = json.loads(script.string)
                        if isinstance(data, dict):
                            img = data.get('image') or data.get('thumbnailUrl')
                            if img:
                                if isinstance(img, list):
                                    img = img[0]
                                if isinstance(img, dict):
                                    img = img.get('url', '')
                                if img and is_valid_image_url(str(img)):
                                    result['image'] = str(img)
                                    print(f"        → JSON-LDから画像取得")
                                    break
                    except:
                        pass

        # ④ 記事内の大きそうな画像
        if not result['image']:
            article_area = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'article|content|entry|post', re.I))
            search_area = article_area if article_area else soup

            for img in search_area.find_all('img', src=True)[:5]:
                src = img.get('src', '')
                if not src or src.startswith('data:'):
                    src = img.get('data-src', '') or img.get('data-lazy-src', '')

                if src:
                    img_url = make_absolute_url(src, final_base_url)
                    if is_valid_image_url(img_url):
                        result['image'] = img_url
                        print(f"        → 記事内画像取得成功")
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


def generate_ai_summary(title: str, original_summary: str, source: str, url: str = "") -> str:
    """
    【AI要約】Gemini APIを使用して優しいトーンの要約を生成
    特別支援教育・インクルーシブ教育の視点から紹介文を作成
    【キャッシュ対応】既存の要約があれば再利用してAPIコールを節約
    """
    global FAILED_SUMMARIES

    # 【キャッシュチェック】既存の有効な要約があれば再利用
    if url and url in SUMMARY_CACHE:
        print(f"        → キャッシュから要約を再利用")
        return SUMMARY_CACHE[url]

    if not gemini_client:
        return original_summary  # Gemini API無効時は元の要約を返す

    try:
        prompt = f"""あなたは「インクルーシブ教育ナビ」の編集者です。
以下の教育関連ニュースを、特別支援教育・インクルーシブ教育に関心のある保護者や教員向けに、
優しく分かりやすいトーンで要約してください。

## 記事情報
タイトル: {title}
出典: {source}
概要: {original_summary}

## 要約のルール
1. 80〜120文字程度で簡潔にまとめる
2. 保護者や教員にとってどのような価値があるかを伝える
3. 専門用語は避け、分かりやすい言葉を使う
4. 優しく親しみやすいトーンで書く
5. 「です・ます」調で統一する

## 出力形式
要約文のみを出力してください（説明や前置きは不要）。"""

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        ai_summary = response.text.strip()
        # 余計な引用符やマークダウンを削除
        ai_summary = re.sub(r'^[「"\']+|[」"\']+$', '', ai_summary)
        ai_summary = re.sub(r'^\*\*|\*\*$', '', ai_summary)

        # 【レート制限対策】API呼び出し後に3秒待機
        time.sleep(3)

        if len(ai_summary) > 10:
            return ai_summary
        else:
            FAILED_SUMMARIES.append({"title": title, "url": url, "reason": "要約が短すぎる"})
            return original_summary

    except Exception as e:
        print(f"        [AI要約エラー] {e}")
        FAILED_SUMMARIES.append({"title": title, "url": url, "reason": str(e)[:50]})
        return original_summary


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


def contains_core_keyword(title: str, summary: str) -> bool:
    """
    【理念フィルタ】理念キーワードを含むかチェック
    タイトルまたは要約にCORE_KEYWORDSのいずれかを含む場合True
    """
    text = f"{title} {summary}".lower()
    return any(keyword.lower() in text for keyword in CORE_KEYWORDS)


def contains_exclude_keyword(title: str, summary: str) -> bool:
    """
    【除外フィルタ】広告・PR記事をスキップ
    """
    text = f"{title} {summary}"
    return any(keyword in text for keyword in EXCLUDE_KEYWORDS)


def contains_practice_exclude_keyword(title: str, summary: str) -> bool:
    """
    【除外フィルタ】細かすぎる実践情報をスキップ
    板書、指導案、学級開き等の教員向けテクニック記事を除外
    """
    text = f"{title} {summary}"
    return any(keyword in text for keyword in PRACTICE_EXCLUDE_KEYWORDS)


def is_small_event_article(title: str, summary: str) -> bool:
    """
    【イベントフィルタ】小規模な研修・イベント記事かどうかを判定
    公的機関が絡むもの以外はTrueを返す（除外対象）
    """
    text = f"{title} {summary}"

    # イベント系キーワードを含むかチェック
    is_event = any(keyword in text for keyword in EVENT_KEYWORDS)
    if not is_event:
        return False  # イベント記事ではない

    # 公的機関キーワードを含むかチェック
    has_public_institution = any(keyword in text for keyword in PUBLIC_INSTITUTION_KEYWORDS)
    if has_public_institution:
        return False  # 公的機関のイベントなので除外しない

    # 小規模イベント（個人の教育実践家など）と判定
    return True


def contains_tech_exclude_keyword(title: str, summary: str) -> bool:
    """
    【除外フィルタ】マニアックな技術解説記事をスキップ
    Scratch、プログラミング解説、共テ解説等
    """
    text = f"{title} {summary}"
    return any(keyword in text for keyword in TECH_EXCLUDE_KEYWORDS)


def is_general_exam_article(title: str, summary: str) -> bool:
    """
    【除外フィルタ】一般の受験情報をスキップ
    特別支援・合理的配慮がセットでない入試情報は除外
    """
    text = f"{title} {summary}"

    # 受験情報キーワードを含むかチェック
    has_exam_keyword = any(keyword in text for keyword in EXAM_EXCLUDE_KEYWORDS)
    if not has_exam_keyword:
        return False  # 受験情報ではない

    # 例外キーワード（特別支援・合理的配慮等）を含むかチェック
    has_exception = any(keyword in text for keyword in EXAM_EXCEPTION_KEYWORDS)
    if has_exception:
        return False  # 特別支援関連の受験情報なので除外しない

    # 一般の受験情報と判定（除外対象）
    return True


def fetch_rss_feed(feed_info: dict) -> list:
    """RSSフィードから記事を取得"""
    articles = []
    feed_name = feed_info['name']
    feed_url = feed_info['url']
    skip_core_filter = feed_info.get('skip_core_filter', False)

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
        for entry in feed.entries[:30]:  # 各フィードから最大30件をチェック
            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()

            if not title or not link:
                continue

            # RSS内の要約を取得
            rss_summary = entry.get('summary', '') or entry.get('description', '')
            rss_summary = truncate_text(rss_summary)

            # 【除外フィルタ】広告・PR記事をスキップ
            if contains_exclude_keyword(title, rss_summary):
                continue

            # 【除外フィルタ】細かすぎる実践情報をスキップ
            if contains_practice_exclude_keyword(title, rss_summary):
                continue

            # 【除外フィルタ】マニアックな技術解説記事をスキップ
            if contains_tech_exclude_keyword(title, rss_summary):
                continue

            # 【除外フィルタ】一般の受験情報をスキップ（特別支援関連は例外）
            if is_general_exam_article(title, rss_summary):
                continue

            # 【除外フィルタ】小規模な研修・イベント記事をスキップ（公的機関は例外）
            if is_small_event_article(title, rss_summary):
                continue

            # 【理念フィルタ】教育専門サイト以外は理念キーワードを含む記事のみ採用
            if not skip_core_filter and not contains_core_keyword(title, rss_summary):
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

            # 【鉄壁ルール】画像URL - 取得失敗時は必ずフォールバック画像を使用
            image_url = metadata.get('image')
            if not image_url or not is_valid_image_url(image_url):
                image_url = get_fallback_image(article_id)
                print(f"        → フォールバック画像を使用: {image_url[:50]}...")
            else:
                print(f"        → 画像URL: {image_url[:60]}...")

            # 要約（ページのdescriptionを優先、なければRSSの要約）
            original_summary = metadata.get('description') or rss_summary
            if not original_summary:
                original_summary = f"{feed_name}の記事です。詳しくは元記事をご覧ください。"

            # 【AI要約】全記事に優しいトーンの要約を生成
            if gemini_client:
                print(f"        → AI要約生成中...")
                summary = generate_ai_summary(title, original_summary, feed_name, link)
            else:
                summary = original_summary

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

        print(f"    → {len(articles)}件の理念合致記事を抽出")

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


def validate_all_images(articles: list) -> list:
    """
    【最終検証】全記事の画像URLを検証
    無効な画像URLがあればフォールバック画像に置換
    """
    for article in articles:
        img_url = article.get('imageUrl', '')
        if not img_url or not is_valid_image_url(img_url):
            article['imageUrl'] = get_fallback_image(article['id'])
            print(f"  [画像修正] {article['title'][:30]}... → フォールバック画像")
    return articles


def save_articles(data: dict) -> None:
    """記事データをJSONファイルに保存"""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n保存完了: {OUTPUT_FILE}")


def main():
    """メイン処理"""
    print("=" * 60)
    print("特別支援教育ニュース収集システム（理念フィルタ版）")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"理念キーワード: {', '.join(CORE_KEYWORDS[:10])}...")
    print()

    # 【キャッシュ読み込み】既存の要約を再利用
    load_summary_cache()
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

    # 【最終検証】画像URLを全チェック
    print()
    print("【4】画像URL最終検証...")
    print("-" * 40)
    final_articles = validate_all_images(final_articles)

    # ソース別の集計を表示
    print()
    print("【5】ソース別記事数:")
    print("-" * 40)
    sources = defaultdict(int)
    for article in final_articles:
        sources[article.get('source', '不明')] += 1

    for source, count in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}件")

    # カテゴリ別の集計を表示
    print()
    print("【6】カテゴリ別記事数:")
    print("-" * 40)
    categories = defaultdict(int)
    for article in final_articles:
        categories[article.get('category', '不明')] += 1

    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}件")

    # 画像URL検証結果
    print()
    print("【7】画像URL検証:")
    print("-" * 40)
    valid_images = sum(1 for a in final_articles if a.get('imageUrl', '').startswith('http'))
    fallback_images = sum(1 for a in final_articles if 'unsplash.com' in a.get('imageUrl', ''))
    print(f"  有効な画像URL: {valid_images}件")
    print(f"  フォールバック画像: {fallback_images}件")
    print(f"  水色の本アイコン: 0件（鉄壁ルール適用）")

    # 保存データを作成
    output_data = {
        "articles": final_articles,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(final_articles),
        "sources": list(sources.keys())
    }

    # ファイルに保存
    save_articles(output_data)

    # 【失敗レポート】AI要約に失敗した記事を報告
    if FAILED_SUMMARIES:
        print()
        print("【8】AI要約失敗レポート:")
        print("-" * 40)
        for failed in FAILED_SUMMARIES:
            print(f"  × {failed['title'][:40]}...")
            print(f"    理由: {failed['reason']}")
        print(f"  合計 {len(FAILED_SUMMARIES)}件 の要約が失敗（元の要約を使用）")
    else:
        print()
        print("【8】AI要約: 全記事成功 ✓")

    # AI要約成功数をカウント
    ai_success_count = len(final_articles) - len(FAILED_SUMMARIES)

    print()
    print("=" * 60)
    print(f"処理完了: 合計 {len(final_articles)}件 の記事を保存")
    print(f"AI要約成功: {ai_success_count}件 / {len(final_articles)}件")
    print("=" * 60)


if __name__ == "__main__":
    main()
