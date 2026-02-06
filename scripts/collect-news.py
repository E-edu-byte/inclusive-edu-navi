#!/usr/bin/env python3
"""
インクルーシブ教育ニュース自動収集スクリプト
RSSフィードから記事を収集し、AIで重要度スコアを付与
"""

import json
import os
import hashlib
from datetime import datetime, timedelta
from dateutil import parser as date_parser
import feedparser
import google.generativeai as genai

# 設定
MAX_ARTICLES = 50  # 保持する最大記事数
SCORE_THRESHOLD = 30  # この点数以下は除外

# RSSフィードソース
RSS_SOURCES = [
    {
        "name": "文部科学省",
        "url": "https://www.mext.go.jp/b_menu/houdou/rss.xml",
        "category": "policy"
    },
    {
        "name": "教育新聞",
        "url": "https://www.kyobun.co.jp/feed/",
        "category": "support"
    },
    {
        "name": "NHK教育",
        "url": "https://www.nhk.or.jp/rss/news/cat6.xml",
        "category": "support"
    },
    {
        "name": "リセマム",
        "url": "https://resemom.jp/rss20/index.rdf",
        "category": "support"
    },
    {
        "name": "ICT教育ニュース",
        "url": "https://ict-enews.net/feed/",
        "category": "ict"
    },
    {
        "name": "EdTechZine",
        "url": "https://edtechzine.jp/rss/new/20/index.xml",
        "category": "ict"
    },
    {
        "name": "朝日新聞 教育",
        "url": "https://www.asahi.com/rss/asahi/edu.rdf",
        "category": "support"
    },
]

# カテゴリマッピング
CATEGORIES = {
    "support": "合理的配慮・支援",
    "diverse-learning": "不登校・多様な学び",
    "policy": "制度・行政",
    "ict": "ICT・教材",
    "events": "イベント・研修"
}


def generate_article_id(url: str) -> str:
    """URLからユニークなIDを生成"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def fetch_rss_feeds() -> list:
    """RSSフィードから記事を取得"""
    articles = []

    for source in RSS_SOURCES:
        try:
            feed = feedparser.parse(source["url"])
            for entry in feed.entries[:10]:  # 各ソースから最大10件
                pub_date = entry.get("published", entry.get("updated", ""))
                if pub_date:
                    try:
                        parsed_date = date_parser.parse(pub_date)
                        date_str = parsed_date.strftime("%Y-%m-%d")
                    except:
                        date_str = datetime.now().strftime("%Y-%m-%d")
                else:
                    date_str = datetime.now().strftime("%Y-%m-%d")

                articles.append({
                    "id": generate_article_id(entry.link),
                    "title": entry.title,
                    "summary": entry.get("summary", entry.get("description", ""))[:200],
                    "url": entry.link,
                    "source": source["name"],
                    "category": source["category"],
                    "date": date_str,
                    "imageUrl": "",
                })
        except Exception as e:
            print(f"Error fetching {source['name']}: {e}")

    return articles


def score_article_with_ai(article: dict, api_key: str) -> int:
    """Gemini AIを使用して記事の重要度をスコアリング"""
    if not api_key:
        # APIキーがない場合はデフォルトスコア
        return 50

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
以下の記事がインクルーシブ教育・特別支援教育に関連する記事として、どれくらい重要かを1〜100点で評価してください。

評価基準：
- インクルーシブ教育、特別支援教育、合理的配慮に直接関係する: 80-100点
- 教育政策、学校教育に関連する: 50-79点
- 間接的に関連する: 30-49点
- ほとんど関連しない: 1-29点

記事タイトル: {article['title']}
記事概要: {article['summary']}

数字のみで回答してください。
"""

        response = model.generate_content(prompt)
        score = int(response.text.strip())
        return max(1, min(100, score))
    except Exception as e:
        print(f"AI scoring error: {e}")
        return 50


def categorize_with_ai(article: dict, api_key: str) -> str:
    """AIでカテゴリを判定"""
    title = article.get('title', '')
    summary = article.get('summary', '')
    text = f"{title} {summary}".lower()

    # 優先キーワードチェック：不登校・多様な学び関連
    diverse_learning_keywords = [
        '不登校', 'フリースクール', 'オルタナティブ', 'オルティナブル',
        '通信制高校', 'ホームスクール', 'ホームエデュケーション',
        '多様な学び', '学校外', '居場所', 'サポート校'
    ]
    for keyword in diverse_learning_keywords:
        if keyword in text:
            return "diverse-learning"

    if not api_key:
        return article.get("category", "support")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
以下の記事を最も適切なカテゴリに分類してください。

【重要】以下のキーワードが含まれる場合は必ず対応するカテゴリを選んでください：
- 「不登校」「フリースクール」「オルタナティブスクール」「通信制高校」「ホームスクール」→ diverse-learning
- 「文部科学省」「法律」「条例」「ガイドライン」「通知」→ policy
- 「アプリ」「AI」「ICT」「デジタル」「EdTech」→ ict
- 「セミナー」「研修」「講演会」「ワークショップ」→ events

カテゴリ選択肢：
- support: 合理的配慮・支援（学校や現場での具体的な支援方法）
- diverse-learning: 不登校・多様な学び（フリースクール、通信制高校、オルタナティブ教育）
- policy: 制度・行政（文科省の通知、法律、自治体の施策）
- ict: ICT・教材（支援技術、デジタル教科書、学習アプリ）
- events: イベント・研修（セミナー、ワークショップ、講演会）

記事タイトル: {article['title']}
記事概要: {article['summary']}

カテゴリIDのみで回答してください（例: support）
"""

        response = model.generate_content(prompt)
        category = response.text.strip().lower()
        if category in CATEGORIES:
            return category
        return "support"
    except Exception as e:
        print(f"AI categorization error: {e}")
        return article.get("category", "support")


def extract_keyword_with_ai(article: dict, api_key: str) -> str:
    """AIでメインキーワードを抽出"""
    if not api_key:
        return ""

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
以下の記事から、関連書籍を検索するための最適なキーワードを1つ抽出してください。

記事タイトル: {article['title']}

キーワードのみで回答してください（例: インクルーシブ教育）
"""

        response = model.generate_content(prompt)
        return response.text.strip()
    except:
        return ""


def main():
    api_key = os.environ.get("GEMINI_API_KEY", "")

    # 既存の記事を読み込み
    articles_path = "public/data/articles.json"
    existing_articles = []
    existing_ids = set()

    if os.path.exists(articles_path):
        with open(articles_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            existing_articles = data.get("articles", [])
            existing_ids = {a["id"] for a in existing_articles}

    # 新しい記事を取得
    new_articles = fetch_rss_feeds()

    # 新規記事のみ処理
    added_count = 0
    for article in new_articles:
        if article["id"] not in existing_ids:
            # AIでスコアリング
            score = score_article_with_ai(article, api_key)

            if score >= SCORE_THRESHOLD:
                # カテゴリを再判定
                article["category"] = categorize_with_ai(article, api_key)
                article["importanceScore"] = score
                article["mainKeyword"] = extract_keyword_with_ai(article, api_key)

                existing_articles.insert(0, article)
                existing_ids.add(article["id"])
                added_count += 1
                print(f"Added: {article['title'][:50]}... (score: {score})")

    # スコア順にソートして上位を保持
    existing_articles.sort(key=lambda x: (x.get("importanceScore", 50), x.get("date", "")), reverse=True)
    existing_articles = existing_articles[:MAX_ARTICLES]

    # 保存
    os.makedirs(os.path.dirname(articles_path), exist_ok=True)
    with open(articles_path, "w", encoding="utf-8") as f:
        json.dump({"articles": existing_articles}, f, ensure_ascii=False, indent=2)

    print(f"\nTotal: {len(existing_articles)} articles, Added: {added_count} new articles")


if __name__ == "__main__":
    main()
