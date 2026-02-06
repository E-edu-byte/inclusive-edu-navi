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
from datetime import datetime, timedelta
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
    # === 教育専門メディア ===
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "skip_core_filter": True,
    },
    {
        "name": "ICT教育ニュース",
        "url": "https://ict-enews.net/feed/",
        "skip_core_filter": True,
    },
    {
        "name": "教育新聞",
        "url": "https://www.kyobun.co.jp/feed/",
        "skip_core_filter": True,
    },
    {
        "name": "EdTechZine",
        "url": "https://edtechzine.jp/rss/new/20/index.xml",
        "skip_core_filter": True,
    },
    # === 大手メディア教育カテゴリ ===
    {
        "name": "朝日新聞 教育",
        "url": "https://www.asahi.com/rss/asahi/edu.rdf",
        "skip_core_filter": False,
    },
    {
        "name": "読売新聞 教育",
        "url": "https://www.yomiuri.co.jp/feed/kyoiku/",
        "skip_core_filter": False,
    },
    # === 通信社・放送局 ===
    {
        "name": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "skip_core_filter": False,
    },
    # ※ 文部科学省はRSSがないため、別途スクレイピングで取得
]

# ドメインごとの最大記事数
MAX_ARTICLES_PER_DOMAIN = 8

# 軽量化モード設定
LIGHT_MODE = True  # 軽量化モード
MAX_ARTICLES_PER_SOURCE = 15  # 各ソースからの最大取得数（増量）

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
    "読み書き困難", "ディスレクシア", "多様な学び",
    # ギフテッド・特異な才能関連（重要トピック）
    "特異な才能", "2e", "二重の特別", "才能児", "高IQ",
    "個別最適", "個別最適化", "過度激動", "OE"
]

# 除外キーワード（広告・PR記事をスキップ）
EXCLUDE_KEYWORDS = [
    "PR", "広告", "プレゼント", "キャンペーン", "セミナー申込",
    "応募締切", "抽選で", "モニター募集", "スポンサー",
    "[PR]", "【PR】", "【広告】", "[AD]"
]

# 有料記事URLパターン（AI判定前に弾く）
PAID_URL_PATTERNS = [
    "/paid/", "/member/", "/premium/", "/subscription/",
    "/login", "?login", "/register", "/subscribe",
    "membership", "shimbun.com", "nikkei.com/article",
    "toyokeizai.net/articles/-/", "premium.toyokeizai"
]

# 除外ドメイン（ログイン制限等で閲覧不可）
EXCLUDED_DOMAINS = [
    "kyoiku.sho.jp",  # みんなの教育技術（ログイン必須）
]

# 【塾・予備校広告の事前除外キーワード】AI判定前に弾く（タイトル・要約）
CRAM_SCHOOL_KEYWORDS = [
    # 塾名・予備校名・塾関連サービス
    "フリーステップ", "TOMAS", "トーマス", "サピックス", "SAPIX",
    "早稲田アカデミー", "早稲アカ", "日能研", "四谷大塚", "栄光ゼミナール",
    "河合塾", "駿台", "東進", "代ゼミ", "Z会", "進研ゼミ",
    "明光義塾", "個別指導", "家庭教師", "スクールIE",
    "塾探し", "塾選び", "塾比較", "塾ナビ",
    # 英才教育・競争系キーワード
    "合格戦略", "合格実績", "偏差値アップ", "点数up", "点数UP",
    "最難関", "難関突破", "志望校合格", "合格率", "合格者数",
    "先取り学習", "飛び級", "英才教育",
    # 講習・模試
    "夏期講習", "冬期講習", "春期講習", "季節講習",
    "模試申込", "模試のお知らせ", "テスト対策",
    # 入試情報（一般）
    "出願状況", "志願状況", "確定志願", "競争率", "実質倍率",
    # 私立学校経営ニュース（インクルーシブ教育と無関係）
    "事業譲渡", "学校法人", "校名変更", "統合", "合併", "経営",
    "ヴィアトール", "洛星", "ノートルダム"
]

# 塾広告の例外キーワード（これらがあれば塾広告でも除外しない）
CRAM_SCHOOL_EXCEPTION_KEYWORDS = [
    "不登校", "特別支援", "発達障害", "学習障害", "ギフテッド",
    "合理的配慮", "インクルーシブ", "通信制", "フリースクール"
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

# 【緩和済み】受験関連は機械的フィルタから除外し、AIによる文脈判断に委ねる
# 明らかに理念と無関係なものだけを機械的に除外
EXAM_EXCLUDE_KEYWORDS = [
    "出願状況", "確定志願者", "志願状況", "募集人員",
    "大学ランキング", "就職率ランキング", "人気ランキング",
    "合格者数", "合格実績", "進学実績"
]

# 受験情報の例外キーワード（これらがあれば除外しない）- AI判定に移行のため縮小
EXAM_EXCEPTION_KEYWORDS = [
    "特別支援", "合理的配慮", "インクルーシブ", "不登校",
    "障害", "障がい", "支援学校", "支援学級"
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

# 【新カテゴリー定義】AI判定用（5カテゴリー）
CATEGORIES = {
    "合理的配慮・支援": "学校や現場での具体的な支援方法、個別の配慮事例、発達障害・学習障害への対応、ギフテッド・2eへの合理的配慮など",
    "不登校・多様な学び": "不登校支援、フリースクール、通信制高校、オルタナティブ教育、ギフテッド（特異な才能）支援、個別最適な学びなど",
    "制度・行政": "文科省の通知、法律・法改正、自治体の施策、予算、ガイドライン、ギフテッド実証事業など",
    "ICT・教材": "支援技術、デジタル教科書、学習アプリ、タブレット活用、EdTechなど",
    "イベント・研修": "セミナー、ワークショップ、講演会、研修会、フォーラムなどの情報",
}

# 出力ファイルパス
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")
STATUS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "status.json")

# 【キャッシュ】既存のarticles.jsonから要約を再利用
SUMMARY_CACHE = {}
FAILED_SUMMARIES = []  # AI要約に失敗した記事をトラッキング

# 【ステータス追跡】API使用状況
API_CALL_COUNT = 0  # 今回の実行でのAPI呼び出し回数
API_ERRORS = []  # エラー情報
DAILY_API_LIMIT = 250  # 1日あたりのAPI上限（無料枠）

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


def generate_ai_summary_and_category(title: str, original_summary: str, source: str, url: str = "") -> dict:
    """
    【AI要約 + カテゴリー判定】Gemini APIを使用
    - 理念に合致する記事：要約とカテゴリーを返す
    - 理念に合致しない記事：{"skip": True}を返す
    【キャッシュ対応】既存の要約があれば再利用（カテゴリーは再判定）
    """
    global FAILED_SUMMARIES, API_CALL_COUNT, API_ERRORS

    # カテゴリー一覧を文字列化
    category_list = "\n".join([f"- {cat}: {desc}" for cat, desc in CATEGORIES.items()])

    # 【キャッシュチェック】既存の有効な要約があれば再利用（カテゴリーのみ再判定）
    cached_summary = None
    if url and url in SUMMARY_CACHE:
        cached_summary = SUMMARY_CACHE[url]
        print(f"        → キャッシュから要約を再利用（カテゴリーは再判定）")

    if not gemini_client:
        return {"summary": original_summary, "category": "合理的配慮・支援", "mainKeyword": "", "skip": False}

    try:
        if cached_summary:
            # キャッシュがある場合はカテゴリー判定 + 除外チェック
            prompt = f"""あなたは公共性の高い教育メディアの編集長です。
以下の記事を判定してください。

【カテゴリー一覧】
{category_list}

【ギフテッド・特異な才能に関する採用基準】
・「ギフテッド」「特異な才能」「2e（二重の特別ニーズ）」に関する記事は積極的に採用
・不登校傾向にあるギフテッド児への支援、公教育での個別最適化、自治体の実証事業は重要トピック
・これらは「不登校・多様な学び」または「合理的配慮・支援」カテゴリーで採用

【厳格な除外ルール】以下は「SKIP」と判定：
・特定の塾・予備校の宣伝（TOMAS、サピックス、フリーステップ、早稲田アカデミー等）
・受験競争での優位性を強調する「先取り学習」「最難関対策」
・「偏差値」「合格率」「合格実績」が主役の記事
・夏期講習、冬期講習、模試の申し込み案内
・たとえ「才能」という言葉を使っていても、競争に勝つための教育サービスはSKIP

【判定のコツ】
その記事が「困り感に寄り添う支援」なら採用、「競争に勝つための教育サービス」ならSKIPです。
ギフテッド支援はインクルーシブ教育の重要な一部として扱ってください。

【緩和ルール】以下のトピックは広くインクルーシブ教育に関連するため、迷った場合は採用：
・一般的な教育改革・学校運営の話題
・デジタル教科書やICT活用（全般）
・学習アプリ・EdTech全般
・多様な学びを支える教育制度の話題

## 記事情報
タイトル: {title}
要約: {cached_summary}

## 出力形式
除外ルールに明確に該当する場合のみ「SKIP」。
それ以外はカテゴリー名のみを出力（例：「不登校・多様な学び」）。"""
        else:
            # 新規の場合は要約とカテゴリーを同時に判定
            prompt = f"""あなたは公共性の高い教育メディア「インクルーシブ教育ナビ」の編集長です。
提供された記事を判定し、要約とカテゴリーを返してください。

【理念】本サイトは以下のテーマを扱います：
・特別支援教育、合理的配慮、発達障害、不登校支援
・子どもの多様な学びを支援するICT・EdTech
・通信制高校、オルタナティブスクール
・ギフテッド（特異な才能）支援、2e支援

【カテゴリー一覧】
{category_list}

【ギフテッド・特異な才能に関する採用基準】（重要）
・「ギフテッド」「特異な才能」「2e（二重の特別ニーズ）」に関する記事は積極的に採用
・不登校傾向にあるギフテッド児への支援、公教育での個別最適化、自治体の実証事業は重要トピック
・これらは「不登校・多様な学び」または「合理的配慮・支援」カテゴリーで採用

【判定ルール】
1. 理念に合致する記事：要約とカテゴリーをJSON形式で返す
2. 以下に該当する記事は「SKIP」のみ返す：
   - 一般の入試倍率・出願状況のみ（不登校支援と無関係）
   - インフルエンザ等の健康ニュース
   - プログラミング技術解説
   - 大学ランキング・偏差値情報

【厳格な除外ルール】以下は本サイトの理念に反するため、必ず「SKIP」と判定：
・特定の塾・予備校の開校案内、コース紹介（TOMAS、サピックス、フリーステップ、早稲田アカデミー等の宣伝）
・受験競争での優位性を強調する「先取り学習」「最難関対策」
・「偏差値」「合格率」「合格実績」が主役になっている記事
・夏期講習、冬期講習、模試の申し込み案内
・たとえ「才能」という言葉を使っていても、競争に勝つための教育サービスはSKIP

【判定のコツ】
その記事が「困り感に寄り添う支援」なら採用、「競争に勝つための教育サービス」ならSKIPです。
ギフテッド支援はインクルーシブ教育の重要な一部として扱ってください。

【緩和ルール】以下のトピックは広くインクルーシブ教育に関連するため、迷った場合は採用：
・一般的な教育改革・学校運営の話題
・デジタル教科書やICT活用（全般）
・学習アプリ・EdTech全般
・多様な学びを支える教育制度の話題

## 記事情報
タイトル: {title}
出典: {source}
概要: {original_summary}

## 出力形式
理念に合致する場合、以下のJSON形式で出力（他の説明文は不要）：
```json
{{"summary": "80〜120文字の優しい要約（です・ます調）", "category": "カテゴリー名", "mainKeyword": "記事を象徴する単語1つ"}}
```
- mainKeyword: その記事の核心を表す単語を1つだけ抽出（例：「メタバース」「合理的配慮」「生成AI」「不登校」「フリースクール」「ICT」「発達障害」など）
- 専門用語や固有名詞を優先し、一般的すぎる言葉（「教育」「学校」など）は避ける
除外ルールに明確に該当する場合のみ「SKIP」。迷ったら採用側に傾ける。"""

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        # API呼び出しカウント
        API_CALL_COUNT += 1

        ai_response = response.text.strip()

        # 【軽量化】待機時間を短縮（3秒）
        time.sleep(3)

        # SKIPの場合
        if ai_response.upper() == 'SKIP' or 'SKIP' in ai_response.upper()[:10]:
            print(f"        → AI判定: 理念に合致しないためSKIP")
            return {"skip": True}

        # キャッシュがある場合（カテゴリーのみ返ってくる）
        if cached_summary:
            # カテゴリー名を抽出
            category = ai_response.strip().replace('「', '').replace('」', '')
            if category in CATEGORIES:
                return {"summary": cached_summary, "category": category, "mainKeyword": "", "skip": False}
            else:
                return {"summary": cached_summary, "category": "合理的配慮・支援", "mainKeyword": "", "skip": False}

        # JSONを抽出してパース
        if "```json" in ai_response:
            json_str = ai_response.split("```json")[1].split("```")[0].strip()
        elif "```" in ai_response:
            json_str = ai_response.split("```")[1].split("```")[0].strip()
        elif "{" in ai_response:
            # JSON部分を抽出
            start = ai_response.index("{")
            end = ai_response.rindex("}") + 1
            json_str = ai_response[start:end]
        else:
            json_str = ai_response

        result = json.loads(json_str)
        summary = result.get("summary", original_summary)
        category = result.get("category", "合理的配慮・支援")
        main_keyword = result.get("mainKeyword", "")

        # カテゴリーが有効か確認
        if category not in CATEGORIES:
            category = "合理的配慮・支援"

        if len(summary) > 10:
            return {"summary": summary, "category": category, "mainKeyword": main_keyword, "skip": False}
        else:
            FAILED_SUMMARIES.append({"title": title, "url": url, "reason": "要約が短すぎる"})
            return {"summary": original_summary, "category": category, "mainKeyword": main_keyword, "skip": False}

    except json.JSONDecodeError as e:
        print(f"        [JSONパースエラー] {e}")
        FAILED_SUMMARIES.append({"title": title, "url": url, "reason": "JSONパースエラー"})
        return {"summary": original_summary, "category": "合理的配慮・支援", "mainKeyword": "", "skip": False}
    except Exception as e:
        error_str = str(e)
        print(f"        [AI判定エラー] {e}")
        FAILED_SUMMARIES.append({"title": title, "url": url, "reason": error_str[:50]})
        # API制限エラーを検出
        if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
            API_ERRORS.append({"type": "quota_exceeded", "message": error_str[:100], "timestamp": datetime.now().isoformat()})
        return {"summary": original_summary, "category": "合理的配慮・支援", "mainKeyword": "", "skip": False}


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


def is_paid_article_url(url: str) -> bool:
    """
    【除外フィルタ】有料記事URLパターンをスキップ
    AI判定前に弾くことで処理を高速化
    """
    url_lower = url.lower()
    return any(pattern in url_lower for pattern in PAID_URL_PATTERNS)


def is_excluded_domain(url: str) -> bool:
    """
    【除外フィルタ】除外ドメインをスキップ
    ログイン制限等で閲覧不可のサイト
    """
    domain = get_domain(url)
    return any(excluded in domain for excluded in EXCLUDED_DOMAINS)


def is_cram_school_ad(title: str, summary: str) -> bool:
    """
    【除外フィルタ】塾・予備校広告をスキップ
    AI判定前にキーワードベースで弾く
    「困り感に寄り添う支援」ではなく「競争に勝つための教育サービス」を除外
    """
    text = f"{title} {summary}"

    # 塾広告キーワードを含むかチェック
    has_cram_keyword = any(keyword in text for keyword in CRAM_SCHOOL_KEYWORDS)
    if not has_cram_keyword:
        return False  # 塾広告ではない

    # 例外キーワード（不登校支援・特別支援等）を含むかチェック
    has_exception = any(keyword in text for keyword in CRAM_SCHOOL_EXCEPTION_KEYWORDS)
    if has_exception:
        return False  # 不登校支援等の文脈なので除外しない

    # 塾広告と判定（除外対象）
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
        max_check = 10 if LIGHT_MODE else 30  # 軽量化モードでは10件までチェック
        for entry in feed.entries[:max_check]:
            # 【軽量化モード】記事数上限チェック
            if LIGHT_MODE and len(articles) >= MAX_ARTICLES_PER_SOURCE:
                print(f"    [軽量化] {MAX_ARTICLES_PER_SOURCE}件に達したため次のソースへ")
                break

            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()

            if not title or not link:
                continue

            # 【除外フィルタ】有料記事URLパターンをスキップ（AI判定前に弾く）
            if is_paid_article_url(link):
                continue

            # 【除外フィルタ】除外ドメインをスキップ（ログイン制限等）
            if is_excluded_domain(link):
                continue

            # RSS内の要約を取得
            rss_summary = entry.get('summary', '') or entry.get('description', '')
            rss_summary = truncate_text(rss_summary)

            # 【除外フィルタ】広告・PR記事をスキップ
            if contains_exclude_keyword(title, rss_summary):
                continue

            # 【除外フィルタ】塾・予備校広告をスキップ（AI判定前に弾く）
            if is_cram_school_ad(title, rss_summary):
                print(f"    [除外] 塾広告: {title[:40]}...")
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

            # 【AI要約 + カテゴリー + mainKeyword判定】
            if gemini_client:
                print(f"        → AI判定（要約＆カテゴリー＆キーワード）...")
                ai_result = generate_ai_summary_and_category(title, original_summary, feed_name, link)

                # 【SKIP判定】AIが理念に合致しないと判断した記事は除外
                if ai_result.get("skip"):
                    continue

                summary = ai_result.get("summary", original_summary)
                category = ai_result.get("category", "合理的配慮・支援")
                main_keyword = ai_result.get("mainKeyword", "")

                # 【キーワードベースのカテゴリ上書き】AIの判定を補完
                text_for_category = f"{title} {summary}".lower()
                diverse_learning_keywords = [
                    '不登校', 'フリースクール', 'オルタナティブ', 'オルティナブル',
                    '通信制高校', 'ホームスクール', 'ホームエデュケーション',
                    '多様な学び', '学校外', 'サポート校', 'nijin', 'ニジン'
                ]
                ict_keywords = ['ict', 'edtech', 'タブレット', 'デジタル教科書', 'アプリ', 'ai活用', '生成ai']
                policy_keywords = ['文部科学省', '文科省', '法改正', '通知', 'ガイドライン', '実証事業']

                for kw in diverse_learning_keywords:
                    if kw in text_for_category:
                        category = "不登校・多様な学び"
                        print(f"        → カテゴリ上書き: 不登校・多様な学び（キーワード: {kw}）")
                        break
                else:
                    for kw in ict_keywords:
                        if kw in text_for_category:
                            category = "ICT・教材"
                            break
                    else:
                        for kw in policy_keywords:
                            if kw in text_for_category:
                                category = "制度・行政"
                                break

                print(f"        → カテゴリー: {category}")
                if main_keyword:
                    print(f"        → メインキーワード: {main_keyword}")
            else:
                summary = original_summary
                category = "合理的配慮・支援"
                main_keyword = ""

            article = {
                "id": article_id,
                "title": title,
                "summary": truncate_text(summary),
                "category": category,
                "date": date_str,
                "url": link,  # 直接記事URLを保存
                "imageUrl": image_url,
                "source": feed_name,
                "mainKeyword": main_keyword  # Amazon検索用キーワード
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


def fetch_mext_press_releases(max_articles: int = 3) -> list:
    """
    文部科学省プレスリリースをスクレイピング（RSSがないため）
    教育関連の重要な政策発表を取得
    """
    articles = []
    mext_url = "https://www.mext.go.jp/b_menu/houdou/index.htm"

    try:
        print("  取得中: 文部科学省 プレスリリース")
        print(f"    URL: {mext_url}")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(mext_url, headers=headers, timeout=15)
        response.raise_for_status()
        response.encoding = 'utf-8'

        soup = BeautifulSoup(response.text, 'html.parser')

        # プレスリリースのリンクを探す
        links = soup.find_all('a', href=True)
        count = 0

        for link in links:
            if count >= max_articles:
                break

            href = link.get('href', '')
            text = link.get_text(strip=True)

            # プレスリリースのリンクパターンをチェック
            if '/b_menu/houdou/' in href and text and len(text) > 10:
                # 相対URLを絶対URLに変換
                if href.startswith('/'):
                    full_url = f"https://www.mext.go.jp{href}"
                else:
                    full_url = href

                # 理念キーワードを含むかチェック
                if not contains_core_keyword(text, ""):
                    continue

                count += 1
                print(f"    [{count}] {text[:50]}...")

                article_id = generate_article_id(full_url)

                article = {
                    "id": article_id,
                    "title": text,
                    "summary": f"文部科学省のプレスリリースです。{text}",
                    "category": "制度・行政",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "url": full_url,
                    "imageUrl": get_fallback_image(article_id),
                    "source": "文部科学省"
                }
                articles.append(article)

        print(f"    → {len(articles)}件の理念合致記事を抽出")

    except Exception as e:
        print(f"    エラー: 文部科学省の取得に失敗 - {e}")

    return articles


def clean_article_data(article: dict) -> dict:
    """
    記事データを軽量化（必要なフィールドのみ保持）
    content, raw_html, description等の長いフィールドを削除
    """
    # 必要なフィールドのみを抽出（軽量化）
    allowed_fields = {'id', 'title', 'summary', 'category', 'date', 'url', 'imageUrl', 'source', 'mainKeyword'}
    cleaned = {k: v for k, v in article.items() if k in allowed_fields}

    # summary は200文字以内に制限
    if 'summary' in cleaned and len(cleaned['summary']) > 200:
        cleaned['summary'] = cleaned['summary'][:197] + '...'

    return cleaned


def save_articles(data: dict) -> None:
    """記事データをJSONファイルに保存（軽量化済み）"""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # 記事データを軽量化
    if 'articles' in data:
        data['articles'] = [clean_article_data(a) for a in data['articles']]

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
    if LIGHT_MODE:
        print(f"    ★ 軽量化モード: 各ソース最大{MAX_ARTICLES_PER_SOURCE}件")
    print("-" * 40)
    for feed_info in RSS_FEEDS:
        articles = fetch_rss_feed(feed_info)
        all_articles.extend(articles)
        print()

    # 文部科学省プレスリリース（RSSなし、スクレイピング）
    print("【1.5】文部科学省プレスリリースを取得中...")
    print("-" * 40)
    mext_articles = fetch_mext_press_releases(max_articles=3)
    all_articles.extend(mext_articles)
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

    # 【追加】1週間以上古い記事を除外
    print()
    print("【2.5】1週間以内の記事のみ保持...")
    one_week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    fresh_articles = [a for a in unique_articles if a.get('date', '') >= one_week_ago]
    removed_count = len(unique_articles) - len(fresh_articles)
    print(f"  除外した古い記事: {removed_count}件")
    print(f"  1週間以内の記事: {len(fresh_articles)}件")
    unique_articles = fresh_articles

    # 日付でソート（新しい順）
    unique_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

    # ドメインごとの制限を適用
    print()
    print("【3】ドメイン制限を適用中...")
    print(f"  （各ドメイン最大{MAX_ARTICLES_PER_DOMAIN}件）")
    limited_articles = apply_domain_limit(unique_articles, MAX_ARTICLES_PER_DOMAIN)
    print(f"  制限適用後: {len(limited_articles)}件")

    # 【厳格ルール】最大50件に制限
    print()
    print("【3.5】最大50件ルールを適用中...")
    MAX_ARTICLES_TOTAL = 50
    if len(limited_articles) > MAX_ARTICLES_TOTAL:
        print(f"  {len(limited_articles)}件 → {MAX_ARTICLES_TOTAL}件に制限")
    final_articles = limited_articles[:MAX_ARTICLES_TOTAL]
    print(f"  最終記事数: {len(final_articles)}件")

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
    print(f"API呼び出し回数: {API_CALL_COUNT}回")
    print("=" * 60)

    # 【ステータス保存】status.jsonに実行状況を記録
    save_status(
        articles_processed=len(final_articles),
        articles_added=len(final_articles),  # 新規追加数（簡略化）
        api_calls=API_CALL_COUNT,
        has_error=len(API_ERRORS) > 0,
        error_message=API_ERRORS[0]["message"] if API_ERRORS else None
    )


def save_status(articles_processed: int, articles_added: int, api_calls: int, has_error: bool, error_message: str = None):
    """システムステータスをstatus.jsonに保存"""
    try:
        # 既存のステータスを読み込み
        existing_status = {"history": []}
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, 'r', encoding='utf-8') as f:
                existing_status = json.load(f)

        # 今日の日付（API制限のリセット基準）
        # 太平洋時間0時 = 日本時間17時でリセット
        now = datetime.now()

        # API使用率を計算（履歴から今日の使用量を集計）
        today_str = now.strftime("%Y-%m-%d")
        today_api_usage = api_calls
        for entry in existing_status.get("history", []):
            entry_date = entry.get("timestamp", "")[:10]
            if entry_date == today_str:
                today_api_usage += entry.get("apiCalls", 0)

        api_percentage = min(100, int((today_api_usage / DAILY_API_LIMIT) * 100))

        # 新しいステータス
        status_data = {
            "lastUpdated": now.isoformat(),
            "apiUsage": {
                "used": today_api_usage,
                "limit": DAILY_API_LIMIT,
                "percentage": api_percentage
            },
            "lastRun": {
                "timestamp": now.isoformat(),
                "articlesProcessed": articles_processed,
                "articlesAdded": articles_added,
                "apiCalls": api_calls,
                "success": not has_error,
                "error": error_message
            },
            "history": existing_status.get("history", [])[-23:] + [{
                "timestamp": now.isoformat(),
                "articlesProcessed": articles_processed,
                "apiCalls": api_calls,
                "success": not has_error
            }]
        }

        # ファイルに保存
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(STATUS_FILE, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, ensure_ascii=False, indent=2)

        print(f"\nステータス保存完了: {STATUS_FILE}")
        print(f"  API使用率: {api_percentage}% ({today_api_usage}/{DAILY_API_LIMIT})")

    except Exception as e:
        print(f"ステータス保存エラー: {e}")


if __name__ == "__main__":
    main()
