#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
特別支援教育関連ニュース自動収集スクリプト
RSSフィードから記事を取得し、理念に基づくキーワードフィルタリングを適用
全記事にGemini AIによる優しい要約を付与

【徹底省エネモード】
- 開発環境: src/data/news.jsonを読み込むだけ（API一切不使用）
- 本番環境: 1ソース3件、重複即スキップ、短縮プロンプト
- --force-fetch フラグで強制再取得
"""

import feedparser
import json
import os
import re
import hashlib
import sys
import io
import time
import argparse
import shutil
from datetime import datetime, timedelta
from typing import Optional, Set
from urllib.parse import urlparse, urljoin
from collections import defaultdict
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# .env.local から環境変数を読み込む
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# ========================================
# 徹底省エネモード設定
# ========================================
def parse_args():
    parser = argparse.ArgumentParser(description='ニュース収集スクリプト')
    parser.add_argument('--force-fetch', action='store_true', help='キャッシュを無視して強制的に再取得')
    parser.add_argument('--dev', action='store_true', help='開発モード（完全キャッシュモード）')
    return parser.parse_args()

ARGS = parse_args()

# 環境判定: CI/GitHub Actions = 本番、それ以外 = 開発（完全キャッシュモード）
IS_CI = os.getenv('CI', 'false').lower() == 'true' or os.getenv('GITHUB_ACTIONS', 'false').lower() == 'true'
IS_DEV_MODE = ARGS.dev or (not IS_CI and not ARGS.force_fetch)
FORCE_FETCH = ARGS.force_fetch

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEV_CACHE_FILE = os.path.join(PROJECT_ROOT, "src", "data", "news.json")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")
STATUS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "status.json")

if IS_DEV_MODE:
    print("=" * 60)
    print("【完全キャッシュモード】開発環境")
    print("  - 外部API: 一切使用しません")
    print("  - データ: src/data/news.json を読み込むだけ")
    print("  - 強制取得: --force-fetch フラグを使用")
    print("=" * 60)

    # 完全キャッシュモード: news.jsonをarticles.jsonにコピーして終了
    if os.path.exists(DEV_CACHE_FILE):
        with open(DEV_CACHE_FILE, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        cache_data['lastUpdated'] = datetime.now().isoformat()
        cache_data['_mode'] = 'dev_cache'

        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)

        print(f"\n[OK] Cache data used: {len(cache_data.get('articles', []))} articles")
        print(f"[OK] Output: {OUTPUT_FILE}")
        print("\n[API USAGE: 0] No API calls in dev mode")
        sys.exit(0)
    else:
        print(f"Warning: Cache file not found: {DEV_CACHE_FILE}")
        print("Running in production mode...")

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
        "name": "EdTechZine",
        "url": "https://edtechzine.jp/rss/new/20/index.xml",
        "skip_core_filter": True,
    },
    {
        "name": "こどもとIT",
        "url": "https://www.watch.impress.co.jp/kodomo_it/rss/rss.xml",
        "skip_core_filter": True,  # 教育ICT専門なのでフィルタ緩和
    },
    # === プレスリリース・大学ニュース ===
    {
        "name": "PR TIMES",
        "url": "https://prtimes.jp/index.php?key=edutech&f=rss",
        "skip_core_filter": False,  # 厳格フィルタ適用
        "strict_keywords": ["インクルーシブ", "特別支援", "障害", "障がい", "発達支援"],
        "max_articles": 2,
    },
    {
        "name": "大学プレスセンター",
        "url": "https://www.u-presscenter.jp/feed",
        "skip_core_filter": False,  # 厳格フィルタ適用
        "strict_keywords": ["特別支援", "障がい学生", "インクルーシブ", "合理的配慮", "発達障害"],
        "max_articles": 2,
    },
    # === 大手メディア教育カテゴリ ===
    {
        "name": "朝日新聞 教育",
        "url": "https://www.asahi.com/rss/asahi/edu.rdf",
        "skip_core_filter": False,
    },
    # === 通信社・放送局 ===
    {
        "name": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "skip_core_filter": False,
    },
    # === 大学・研究機関（厳格フィルタ適用） ===
    {
        "name": "東京大学 教育学研究科",
        "url": "https://www.p.u-tokyo.ac.jp/news/feed",
        "skip_core_filter": False,
        "is_research_institution": True,  # 厳格キーワードフィルタ
        "max_articles": 2,  # 最大2件
    },
    {
        "name": "東京学芸大学",
        "url": "https://www.u-gakugei.ac.jp/news/index.xml",
        "skip_core_filter": False,
        "is_research_institution": True,  # 厳格キーワードフィルタ
        "max_articles": 2,  # 最大2件
    },
    # === ビジネスメディア ===
    {
        "name": "PRESIDENT Online",
        "url": "https://president.jp/list/rss",
        "skip_core_filter": False,
        "strict_keywords": ["教育", "子ども", "発達", "学校", "インクルーシブ", "特別支援", "障害", "ギフテッド", "不登校"],
        "max_articles": 2,
    },
    # === 研究・科学メディア（日本語のみ） ===
    {
        "name": "理化学研究所",
        "url": "https://www.riken.jp/feed/press_feed/",
        "skip_core_filter": False,
        "force_category": "研究",
        "strict_keywords": ["脳", "感情", "遺伝子", "疾患", "心理", "神経", "認知", "発達", "学習", "記憶"],
        "max_articles": 3,
    },
    {
        "name": "科学技術振興機構 (JST)",
        "url": "https://www.jst.go.jp/rss/press.xml",
        "skip_core_filter": False,
        "force_category": "研究",
        "strict_keywords": ["脳", "教育", "発達", "心理", "認知", "学習", "神経", "AI", "インクルーシブ"],
        "max_articles": 3,
    },
    # ※ 文部科学省・筑波大学はRSSがないため、別途スクレイピングで取得
]

# 大学・研究機関（スクレイピング対象）
RESEARCH_INSTITUTIONS = [
    {
        "name": "筑波大学 人間系",
        "url": "https://www.human.tsukuba.ac.jp/human/news/",
        "max_articles": 2,
    },
]

# ドメインごとの最大記事数
MAX_ARTICLES_PER_DOMAIN = 3

# 【徹底省エネ設定】取得件数を最小限に
LIGHT_MODE = True
MAX_ARTICLES_PER_SOURCE = 3  # 各ソースから最大3件（徹底節約）
MAX_NEW_ARTICLES_PER_RUN = 10  # 1回の実行で追加する最大記事数（新規）
MAX_AI_CALLS_PER_RUN = 20  # 1回の実行でのAI呼び出し最大数（リトライ+新規合計）
AI_CALL_SLEEP_SECONDS = 1  # AI呼び出し間の待機秒数（GitHub Actions高速化）

# AI呼び出しカウンター（リトライ+新規の合計）
TOTAL_AI_CALLS_THIS_RUN = 0

# 既存記事のタイトル（重複チェック用）
EXISTING_TITLES: Set[str] = set()

# 既存記事のURL（重複チェック用）
EXISTING_URLS: Set[str] = set()

# 既存記事リスト（追記保存用）
EXISTING_ARTICLES: list = []

# 最大保持記事数
MAX_ARTICLES_RETENTION = 100

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

# 【新カテゴリー定義】AI判定用（6カテゴリー）
CATEGORIES = {
    "支援・合理的配慮": "学校や現場での具体的な支援方法、個別の配慮事例、発達障害・学習障害への対応、ギフテッド・2eへの合理的配慮など",
    "多様な学び": "不登校支援、フリースクール、通信制高校、オルタナティブ教育、ギフテッド（特異な才能）支援、個別最適な学びなど",
    "研究": "脳科学、脳機能、神経科学、認知科学、発達研究、教育心理学、学術論文、研究機関の成果発表など",
    "制度・行政": "文科省の通知、法律・法改正、自治体の施策、予算、ガイドライン、ギフテッド実証事業など",
    "ICT・教材": "支援技術、デジタル教科書、学習アプリ、タブレット活用、EdTechなど",
    "イベント・研修": "セミナー、ワークショップ、講演会、研修会、フォーラムなどの情報",
}

# 【キャッシュ】既存のarticles.jsonから要約を再利用
SUMMARY_CACHE = {}
FAILED_SUMMARIES = []  # AI要約に失敗した記事をトラッキング

# 【ステータス追跡】API使用状況
API_CALL_COUNT = 0  # 今回の実行でのAPI呼び出し回数
API_ERRORS = []  # エラー情報
DAILY_API_LIMIT = 20  # 1日あたりのAPI上限（Gemini無料枠: モデルあたり20リクエスト/日）

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


def load_existing_articles():
    """
    【追記保存の核心】既存記事を完全に読み込み
    - タイトル・URLで重複チェック用セットを作成
    - 既存記事リストを保持（後で新規記事と結合）
    """
    global EXISTING_TITLES, EXISTING_URLS, EXISTING_ARTICLES
    try:
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                EXISTING_ARTICLES = data.get('articles', [])
                for article in EXISTING_ARTICLES:
                    title = article.get('title', '').strip()
                    url = article.get('url', '').strip()
                    if title:
                        EXISTING_TITLES.add(title)
                    if url:
                        EXISTING_URLS.add(url)
            print(f"✓ 既存記事読み込み: {len(EXISTING_ARTICLES)}件")
            print(f"  - タイトル: {len(EXISTING_TITLES)}件")
            print(f"  - URL: {len(EXISTING_URLS)}件")
    except Exception as e:
        print(f"警告: 既存記事読み込みエラー - {e}")
        EXISTING_ARTICLES = []


def is_duplicate_article(title: str, url: str) -> bool:
    """
    【重複チェック】タイトルまたはURLが既存記事と重複しているかチェック
    重複している場合、AI要約を含む全処理をスキップ
    """
    title_clean = title.strip()
    url_clean = url.strip()
    return title_clean in EXISTING_TITLES or url_clean in EXISTING_URLS


def is_duplicate_title(title: str) -> bool:
    """タイトルが既存記事と重複しているかチェック（後方互換性のため維持）"""
    return title.strip() in EXISTING_TITLES


def load_existing_titles():
    """後方互換性のためのラッパー - load_existing_articlesを呼び出す"""
    load_existing_articles()


# ========================================
# 不完全な要約の検出とリトライ
# ========================================
# 定型文パターン（これらの文言のみの要約は不完全とみなす）
INCOMPLETE_SUMMARY_PATTERNS = [
    "の記事です",
    "のお知らせです",
    "のニュースです",
    "のプレスリリースです",
]

# 強制リトライ対象のパターン（これらが含まれる場合は必ずリトライ）
FORCE_RETRY_PATTERNS = [
    "EdTechZineの記事です",
    "詳しくは元記事をご覧ください",
    "JSTのプレスリリースです",
    "理化学研究所のプレスリリースです",
]

MAX_SUMMARY_RETRY = 10  # 1回の実行でリトライする最大件数（ユーザー要求: 10件テスト）


def is_incomplete_summary(summary: str, source: str = "") -> bool:
    """
    要約が不完全かどうかを判定
    - 40文字以下
    - 定型文のみ（「〇〇の記事です」など）
    - EdTechZine定型文が含まれる場合は強制的に不完全とみなす
    - 「内容取得失敗」マーク付きはリトライ対象外
    """
    if not summary:
        return True

    summary_clean = summary.strip()

    # 「内容取得失敗」マーク付きはリトライ対象外（無限ループ防止）
    if "(内容取得失敗)" in summary_clean:
        return False

    # 「要約準備中」マークは不完全（リトライ対象）
    if "【要約準備中】" in summary_clean:
        return True

    # 40文字以下は不完全
    if len(summary_clean) <= 40:
        return True

    # RIKENのサブタイトルパターン（「－」で始まり「－」で終わる）は不完全
    if summary_clean.startswith("－") and summary_clean.endswith("－"):
        return True

    # 強制リトライパターン（EdTechZineなど）
    for pattern in FORCE_RETRY_PATTERNS:
        if pattern in summary_clean:
            return True

    # 定型文パターンに一致するかチェック
    for pattern in INCOMPLETE_SUMMARY_PATTERNS:
        if pattern in summary_clean:
            # ソース名 + 定型文のみの場合（例：「〇〇の記事です」）
            # 定型文を除いた部分がソース名だけなら不完全
            before_pattern = summary_clean.split(pattern)[0]
            if len(before_pattern) < 20:  # ソース名程度の短さなら定型文のみ
                return True

    return False


def retry_incomplete_summaries():
    """
    既存記事の不完全な要約をリトライする
    - 最大 MAX_SUMMARY_RETRY 件まで
    - API制限を考慮して制限付きで実行
    """
    global EXISTING_ARTICLES, TOTAL_AI_CALLS_THIS_RUN

    if IS_DEV_MODE:
        print("  [開発モード] 要約リトライをスキップ")
        return

    if not gemini_client:
        print("  [警告] Gemini APIが利用不可のためリトライをスキップ")
        return

    # 不完全な要約を持つ記事を検出
    incomplete_articles = []
    for i, article in enumerate(EXISTING_ARTICLES):
        summary = article.get('summary', '')
        source = article.get('source', '')
        if is_incomplete_summary(summary, source):
            incomplete_articles.append((i, article))

    if not incomplete_articles:
        print("  → 不完全な要約: 0件（リトライ不要）")
        return

    print(f"  → 不完全な要約: {len(incomplete_articles)}件を検出")

    # 最大件数に制限（グローバル上限も考慮）
    available_slots = MAX_AI_CALLS_PER_RUN - TOTAL_AI_CALLS_THIS_RUN
    retry_limit = min(MAX_SUMMARY_RETRY, available_slots)
    retry_targets = incomplete_articles[:retry_limit]
    print(f"  → リトライ対象: {len(retry_targets)}件（上限{retry_limit}件、残りAI枠{available_slots}件）")

    if retry_limit <= 0:
        print("  [省エネ] AI呼び出し上限に達しているためリトライをスキップ")
        return

    retry_success = 0
    edtech_updated = []  # EdTechZine更新記録
    for idx, article in retry_targets:
        # グローバルAI呼び出し上限チェック
        if TOTAL_AI_CALLS_THIS_RUN >= MAX_AI_CALLS_PER_RUN:
            print(f"    [省エネ] AI呼び出し上限({MAX_AI_CALLS_PER_RUN}件)に達したため終了")
            break

        title = article.get('title', '')
        url = article.get('url', '')
        source = article.get('source', '')
        old_summary = article.get('summary', '')
        is_edtech = source == 'EdTechZine'

        print(f"    リトライ中: {title[:40]}...")
        TOTAL_AI_CALLS_THIS_RUN += 1

        try:
            # AI要約を再実行
            result = generate_ai_summary_and_category(
                title=title,
                original_summary=old_summary,
                source=source,
                url=url
            )

            if result.get('skip'):
                print(f"      → SKIP判定（そのまま維持）")
                continue

            new_summary = result.get('summary', '')
            new_category = result.get('category', '')

            # 新しい要約が有効かチェック
            if new_summary and len(new_summary) > 40 and not is_incomplete_summary(new_summary, source):
                EXISTING_ARTICLES[idx]['summary'] = new_summary
                if new_category:
                    EXISTING_ARTICLES[idx]['category'] = new_category
                retry_success += 1
                print(f"      → 成功: {new_summary[:30]}...")

                # EdTechZine更新の記録
                if is_edtech:
                    edtech_updated.append(title)
            else:
                # リトライ失敗: 再リトライを防ぐためマークを付ける
                if is_edtech and "(内容取得失敗)" not in old_summary:
                    EXISTING_ARTICLES[idx]['summary'] = f"{title[:60]}... (内容取得失敗)"
                    print(f"      → 取得失敗マークを付与")
                else:
                    print(f"      → 改善なし（そのまま維持）")

        except Exception as e:
            print(f"      → エラー: {e}")
            # エラー時もマークを付ける
            if is_edtech and "(内容取得失敗)" not in old_summary:
                EXISTING_ARTICLES[idx]['summary'] = f"{title[:60]}... (内容取得失敗)"

    print(f"  → リトライ完了: {retry_success}/{len(retry_targets)}件 成功")

    # EdTechZine更新の詳細ログ
    if edtech_updated:
        print()
        print("  【EdTechZine要約更新】")
        for title in edtech_updated:
            print(f"    ✓ EdTechZineの要約を更新しました: {title[:50]}")


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

# 大学・研究機関専用フォールバック画像（大学キャンパス・研究イメージ）
UNIVERSITY_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop",  # 大学キャンパス
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop",  # 大学図書館
    "https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=400&h=300&fit=crop",  # 研究イメージ
    "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=400&h=300&fit=crop",  # 学術的なイメージ
]

def get_university_fallback_image(article_id: str) -> str:
    """大学・研究機関記事用のフォールバック画像を選択"""
    index = sum(ord(c) for c in article_id) % len(UNIVERSITY_FALLBACK_IMAGES)
    return UNIVERSITY_FALLBACK_IMAGES[index]


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


def generate_ai_summary_and_category(title: str, original_summary: str, source: str, url: str = "", retry_count: int = 0) -> dict:
    """
    【AI要約 + カテゴリー判定】Gemini APIを使用
    - 理念に合致する記事：要約とカテゴリーを返す
    - 理念に合致しない記事：{"skip": True}を返す
    【省エネモード】開発環境ではAPIを使用しない
    【軽量化】タイトル+冒頭100文字のみをAIに送信
    【429対策】指数バックオフで最大3回リトライ
    """
    global FAILED_SUMMARIES, API_CALL_COUNT, API_ERRORS

    MAX_RETRY = 3  # 最大リトライ回数
    BASE_WAIT = 1  # 基本待機時間（秒）- GitHub Actions高速化のため最短設定

    # 【省エネモード】開発環境ではAIを使用しない
    if IS_DEV_MODE:
        # キーワードベースで簡易カテゴリ判定
        text = f"{title} {original_summary}".lower()
        category = "支援・合理的配慮"
        if any(kw in text for kw in ['脳機能', '脳科学', '神経科学', '認知科学', '理化学研究所', 'riken', '研究成果', '論文']):
            category = "研究"
        elif any(kw in text for kw in ['不登校', 'フリースクール', 'オルタナティブ', '通信制']):
            category = "多様な学び"
        elif any(kw in text for kw in ['ict', 'アプリ', 'デジタル', 'ai', 'edtech']):
            category = "ICT・教材"
        elif any(kw in text for kw in ['文部科学省', '文科省', '法改正', '通知']):
            category = "制度・行政"
        return {"summary": original_summary[:150], "category": category, "mainKeyword": "", "skip": False}

    # 【軽量化】入力テキストを100文字に制限
    short_summary = original_summary[:100] if original_summary else ""

    # カテゴリー一覧を簡素化
    category_list = "support(支援), diverse-learning(多様な学び), research(研究), policy(行政), ict(ICT), events(イベント)"

    # 【キャッシュチェック】既存の有効な要約があれば再利用（カテゴリーのみ再判定）
    cached_summary = None
    if url and url in SUMMARY_CACHE:
        cached_summary = SUMMARY_CACHE[url]
        print(f"        → キャッシュから要約を再利用（カテゴリーは再判定）")

    if not gemini_client:
        return {"summary": original_summary, "category": "支援・合理的配慮", "mainKeyword": "", "skip": False}

    try:
        if cached_summary:
            # キャッシュがある場合はカテゴリー判定のみ（短縮プロンプト）
            prompt = f"""記事のカテゴリを判定。塾広告・受験競争系はSKIP。
カテゴリ: 支援・合理的配慮 / 多様な学び / 研究 / 制度・行政 / ICT・教材 / イベント・研修
タイトル: {title}
→カテゴリ名のみ回答（または SKIP）"""
        else:
            # 新規の場合は要約とカテゴリーを同時に判定（短縮プロンプト）
            prompt = f"""インクルーシブ教育メディア記事判定。塾広告・受験競争系はSKIP。
カテゴリ: 支援・合理的配慮 / 多様な学び / 研究 / 制度・行政 / ICT・教材 / イベント・研修

タイトル: {title}
概要: {short_summary}

JSON形式で回答: {{"summary":"80字の要約","category":"カテゴリ名","mainKeyword":"キーワード1つ"}}
または SKIP"""

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        # API呼び出しカウント
        API_CALL_COUNT += 1

        ai_response = response.text.strip()

        # 【429対策】待機時間を5秒に設定（API制限回避）
        time.sleep(BASE_WAIT)

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
                return {"summary": cached_summary, "category": "支援・合理的配慮", "mainKeyword": "", "skip": False}

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
        category = result.get("category", "支援・合理的配慮")
        main_keyword = result.get("mainKeyword", "")

        # カテゴリーが有効か確認
        if category not in CATEGORIES:
            category = "支援・合理的配慮"

        if len(summary) > 10:
            return {"summary": summary, "category": category, "mainKeyword": main_keyword, "skip": False}
        else:
            FAILED_SUMMARIES.append({"title": title, "url": url, "reason": "要約が短すぎる"})
            return {"summary": original_summary, "category": category, "mainKeyword": main_keyword, "skip": False}

    except json.JSONDecodeError as e:
        print(f"        [JSONパースエラー] {e}")
        FAILED_SUMMARIES.append({"title": title, "url": url, "reason": "JSONパースエラー"})
        # JSONパースエラーはリトライしない（AIからの応答形式の問題）
        return {"summary": "", "category": "支援・合理的配慮", "mainKeyword": "", "skip": False, "needs_retry": True}
    except Exception as e:
        error_str = str(e)
        print(f"        [AI判定エラー] {e}")

        # API制限エラー（429）を検出した場合は指数バックオフでリトライ
        if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower() or "resource_exhausted" in error_str.lower():
            if retry_count < MAX_RETRY:
                wait_time = BASE_WAIT * (2 ** retry_count)  # 指数バックオフ: 1秒, 2秒, 4秒
                print(f"        [429対策] {wait_time}秒待機後にリトライ ({retry_count + 1}/{MAX_RETRY})")
                time.sleep(wait_time)
                return generate_ai_summary_and_category(title, original_summary, source, url, retry_count + 1)
            else:
                print(f"        [429対策] リトライ上限に達しました。後で再試行が必要です。")
                API_ERRORS.append({"type": "quota_exceeded", "message": error_str[:100], "timestamp": datetime.now().isoformat()})
                # リトライ上限到達時は空の要約を返し、後で再試行できるようにマーク
                return {"summary": "", "category": "支援・合理的配慮", "mainKeyword": "", "skip": False, "needs_retry": True}

        FAILED_SUMMARIES.append({"title": title, "url": url, "reason": error_str[:50]})
        # その他のエラーも空の要約を返す（フォールバックなし）
        return {"summary": "", "category": "支援・合理的配慮", "mainKeyword": "", "skip": False, "needs_retry": True}


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
    duplicate_count = 0  # 重複スキップのカウンター

    try:
        print(f"  ■ {feed_name}")
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

            # 【API節約】重複チェック - 既存記事と同じタイトルまたはURLならAI要約前にスキップ
            if is_duplicate_article(title, link):
                duplicate_count += 1
                continue

            processed += 1
            print(f"    [{processed}] {title[:50]}...")

            # 【省エネ】1回の実行で追加する記事数を制限
            if len(articles) >= MAX_NEW_ARTICLES_PER_RUN:
                print(f"    [省エネ] 最大追加数 {MAX_NEW_ARTICLES_PER_RUN}件に達したため終了")
                break

            # 【省エネ】グローバルAI呼び出し上限チェック
            global TOTAL_AI_CALLS_THIS_RUN
            if TOTAL_AI_CALLS_THIS_RUN >= MAX_AI_CALLS_PER_RUN:
                print(f"    [省エネ] AI呼び出し上限({MAX_AI_CALLS_PER_RUN}件)に達したため終了")
                break

            # 記事IDを生成
            article_id = generate_article_id(link)

            # 公開日を取得
            date_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
            date_str = parse_date(date_parsed)

            # 【省エネ】開発モードではページ解析とAPI呼び出しをスキップ
            if IS_DEV_MODE:
                image_url = get_fallback_image(article_id)
                original_summary = rss_summary or f"{feed_name}の記事です。"
                # キーワードベースで簡易カテゴリ判定
                text = f"{title} {original_summary}".lower()
                category = "支援・合理的配慮"
                if any(kw in text for kw in ['脳機能', '脳科学', '神経科学', '認知科学', '理化学研究所', 'riken', '研究成果', '論文']):
                    category = "研究"
                elif any(kw in text for kw in ['不登校', 'フリースクール', 'オルタナティブ', '通信制']):
                    category = "多様な学び"
                elif any(kw in text for kw in ['ict', 'アプリ', 'デジタル', 'ai', 'edtech']):
                    category = "ICT・教材"
                elif any(kw in text for kw in ['文部科学省', '文科省', '法改正', '通知']):
                    category = "制度・行政"
                summary = original_summary[:150]
                main_keyword = ""
            else:
                # 本番モード：ページ解析とAI判定を実行
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
                print(f"        → AI判定（要約＆カテゴリー＆キーワード）...")
                TOTAL_AI_CALLS_THIS_RUN += 1
                ai_result = generate_ai_summary_and_category(title, original_summary, feed_name, link)

                # 【SKIP判定】AIが理念に合致しないと判断した記事は除外
                if ai_result.get("skip"):
                    continue

                # 【要約取得】AIからの要約を取得（フォールバックなし）
                summary = ai_result.get("summary", "")
                category = ai_result.get("category", "支援・合理的配慮")
                main_keyword = ai_result.get("mainKeyword", "")

                # 【リトライ必要フラグ】要約が取得できなかった場合はスキップ（後でリトライ）
                if ai_result.get("needs_retry") or not summary or len(summary) < 20:
                    print(f"        → 要約取得失敗（後でリトライ）")
                    # 要約なしでも記事は追加し、後でリトライできるようにする
                    summary = f"【要約準備中】{title[:60]}..."

                # 【キーワードベースのカテゴリ上書き】AIの判定を補完
                text_for_category = f"{title} {summary}".lower()
                research_keywords = ['脳機能', '脳科学', '神経科学', '認知科学', '理化学研究所', 'riken', '研究成果', '論文', '脳神経']
                diverse_learning_keywords = [
                    '不登校', 'フリースクール', 'オルタナティブ', 'オルティナブル',
                    '通信制高校', 'ホームスクール', 'ホームエデュケーション',
                    '多様な学び', '学校外', 'サポート校', 'nijin', 'ニジン'
                ]
                ict_keywords = ['ict', 'edtech', 'タブレット', 'デジタル教科書', 'アプリ', 'ai活用', '生成ai']
                policy_keywords = ['文部科学省', '文科省', '法改正', '通知', 'ガイドライン', '実証事業']

                # 研究カテゴリを最優先でチェック
                for kw in research_keywords:
                    if kw in text_for_category:
                        category = "研究"
                        print(f"        → カテゴリ上書き: 研究（キーワード: {kw}）")
                        break
                else:
                    for kw in diverse_learning_keywords:
                        if kw in text_for_category:
                            category = "多様な学び"
                            print(f"        → カテゴリ上書き: 多様な学び（キーワード: {kw}）")
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

        # ソースごとのサマリー表示
        if len(articles) > 0 or duplicate_count > 0:
            print(f"    → 新規: {len(articles)}件 / 重複スキップ: {duplicate_count}件")

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
    duplicate_count = 0
    mext_url = "https://www.mext.go.jp/b_menu/houdou/index.htm"

    try:
        print("  ■ 文部科学省 プレスリリース")
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

                # 重複チェック
                if is_duplicate_article(text, full_url):
                    duplicate_count += 1
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

        if len(articles) > 0 or duplicate_count > 0:
            print(f"    → 新規: {len(articles)}件 / 重複スキップ: {duplicate_count}件")

    except Exception as e:
        print(f"    エラー: 文部科学省の取得に失敗 - {e}")

    return articles


def fetch_tsukuba_human_news(max_articles: int = 2) -> list:
    """
    筑波大学 人間系のニュースをスクレイピング
    特別支援教育・教育心理学の研究拠点
    """
    articles = []
    duplicate_count = 0
    tsukuba_url = "https://www.human.tsukuba.ac.jp/human/news/"

    try:
        print(f"    URL: {tsukuba_url}")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        response = requests.get(tsukuba_url, headers=headers, timeout=15)
        response.raise_for_status()
        response.encoding = 'utf-8'

        soup = BeautifulSoup(response.text, 'html.parser')

        # ニュース記事のリンクを探す
        news_items = soup.find_all('a', href=True)
        count = 0

        for item in news_items:
            if count >= max_articles:
                break

            href = item.get('href', '')
            text = item.get_text(strip=True)

            # ニュース記事のリンクパターンをチェック
            if '/news/' in href and text and len(text) > 10:
                # 相対URLを絶対URLに変換
                if href.startswith('/'):
                    full_url = f"https://www.human.tsukuba.ac.jp{href}"
                elif not href.startswith('http'):
                    full_url = f"https://www.human.tsukuba.ac.jp/human/news/{href}"
                else:
                    full_url = href

                # 重複チェック
                if is_duplicate_article(text, full_url):
                    duplicate_count += 1
                    continue

                # 【厳格フィルタ】理念キーワードを含む記事のみ
                if not contains_core_keyword(text, ""):
                    continue

                count += 1
                print(f"    [{count}] {text[:50]}...")

                article_id = generate_article_id(full_url)

                article = {
                    "id": article_id,
                    "title": text,
                    "summary": f"筑波大学人間系のお知らせです。{text}",
                    "category": "合理的配慮・支援",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "url": full_url,
                    "imageUrl": get_university_fallback_image(article_id),
                    "source": "筑波大学 人間系",
                    "mainKeyword": "特別支援教育"
                }
                articles.append(article)

        if len(articles) > 0 or duplicate_count > 0:
            print(f"    → 新規: {len(articles)}件 / 重複スキップ: {duplicate_count}件")

    except Exception as e:
        print(f"    エラー: 筑波大学の取得に失敗 - {e}")

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
    print("特別支援教育ニュース収集システム（省エネ版）")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"モード: {'開発（APIスキップ）' if IS_DEV_MODE else '本番'}")
    print(f"理念キーワード: {', '.join(CORE_KEYWORDS[:10])}...")
    print()

    # 【キャッシュ読み込み】既存の要約を再利用
    load_summary_cache()

    # 【重複チェック用】既存タイトルを読み込み
    load_existing_titles()

    # 【要約リトライ】不完全な要約を持つ既存記事を再処理
    print()
    print("【0.5】不完全な要約のリトライ...")
    print("-" * 40)
    retry_incomplete_summaries()
    print()

    all_articles = []

    # RSSフィードから収集
    print("【1】RSSフィードを取得中...")
    print(f"    ★ 省エネモード: 各ソース最大{MAX_ARTICLES_PER_SOURCE}件、重複スキップ")
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

    # 専門機関・大学（スクレイピング）
    print("【1.6】専門機関・大学のニュースを取得中...")
    print("-" * 40)

    # 筑波大学 人間系
    print("  ■ 筑波大学 人間系")
    tsukuba_articles = fetch_tsukuba_human_news(max_articles=2)
    all_articles.extend(tsukuba_articles)
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

    # ドメインごとの制限を適用（今回取得分のみ）
    print()
    print("【3】ドメイン制限を適用中...")
    print(f"  （各ドメイン最大{MAX_ARTICLES_PER_DOMAIN}件）")
    limited_articles = apply_domain_limit(unique_articles, MAX_ARTICLES_PER_DOMAIN)
    print(f"  制限適用後: {len(limited_articles)}件")

    # 今回取得分を最終リストに（既存記事との結合は後で行う）
    final_articles = limited_articles
    print(f"  今回取得: {len(final_articles)}件（既存記事との結合は後で実施）")

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

    # ========================================
    # 【追記保存】新規記事を先頭に追加、既存記事は維持
    # ========================================
    print()
    print("【7.5】追記保存（新規を先頭に追加）...")
    print("-" * 40)

    # 新規記事のみを抽出（既存URLと重複しないもの）
    truly_new_articles = []
    for article in final_articles:
        url = article.get('url', '')
        title = article.get('title', '')
        if not is_duplicate_article(title, url):
            truly_new_articles.append(article)

    print(f"  今回の取得: {len(final_articles)}件")
    print(f"  うち新規: {len(truly_new_articles)}件")
    print(f"  既存記事: {len(EXISTING_ARTICLES)}件")

    # 新規記事を先頭に追加し、既存記事をそのまま後ろに維持
    merged_articles = truly_new_articles + EXISTING_ARTICLES

    # 日付でソート（新しい順）
    merged_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

    # 最大100件に制限（古い記事から削除）
    if len(merged_articles) > MAX_ARTICLES_RETENTION:
        removed_count = len(merged_articles) - MAX_ARTICLES_RETENTION
        print(f"  → {removed_count}件の古い記事を削除（最大{MAX_ARTICLES_RETENTION}件維持）")
        merged_articles = merged_articles[:MAX_ARTICLES_RETENTION]

    print(f"  最終保存: {len(merged_articles)}件")

    # ソースを再集計
    sources = defaultdict(int)
    for article in merged_articles:
        sources[article.get('source', '不明')] += 1

    # 保存データを作成
    output_data = {
        "articles": merged_articles,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(merged_articles),
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
