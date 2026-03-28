#!/usr/bin/env python3
"""
新着記事をXに自動投稿するスクリプト
GitHub Actionsから呼び出される
"""

import json
import os
import sys
import tweepy

# 設定
SITE_URL = "https://news-navi.jp/inclusive"
ARTICLES_FILE = "public/data/articles.json"
POSTED_FILE = "public/data/posted-tweets.json"  # 投稿済み記事IDを保存

# ハッシュタグ
HASHTAGS = "#新着ニュース #インクルーシブ教育 #特別支援教育"


def load_articles():
    """記事データを読み込む"""
    try:
        with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('articles', [])
    except Exception as e:
        print(f"記事データ読み込みエラー: {e}")
        return []


def load_posted_ids():
    """投稿済み記事IDを読み込む"""
    try:
        if os.path.exists(POSTED_FILE):
            with open(POSTED_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data.get('posted_ids', []))
    except Exception as e:
        print(f"投稿済みID読み込みエラー: {e}")
    return set()


def save_posted_ids(posted_ids):
    """投稿済み記事IDを保存"""
    try:
        # 最新500件のみ保持（ファイル肥大化防止）
        ids_list = list(posted_ids)[-500:]
        with open(POSTED_FILE, 'w', encoding='utf-8') as f:
            json.dump({'posted_ids': ids_list}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"投稿済みID保存エラー: {e}")


def create_tweet_text(article):
    """ツイート本文を生成"""
    title = article.get('title', '')
    article_id = article.get('id', '')
    category = article.get('category', '')

    # タイトルが長すぎる場合は短縮（文字数制限対策）
    max_title_len = 70
    if len(title) > max_title_len:
        title = title[:max_title_len-3] + "..."

    # 記事URL（個別記事ページ）
    article_url = f"{SITE_URL}/article/{article_id}/"

    # ツイート本文
    tweet = f"📰 新着ニュース【{category}】\n\n{title}\n\n👉 {article_url}\n\n{HASHTAGS}"

    return tweet


def post_tweet(tweet_text):
    """Xにツイートを投稿"""
    # 環境変数から認証情報を取得
    api_key = os.environ.get('X_API_KEY')
    api_secret = os.environ.get('X_API_SECRET')
    access_token = os.environ.get('X_ACCESS_TOKEN')
    access_token_secret = os.environ.get('X_ACCESS_TOKEN_SECRET')

    if not all([api_key, api_secret, access_token, access_token_secret]):
        print("エラー: X API認証情報が設定されていません")
        return False

    try:
        # Tweepy v2 Client を使用
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )

        # ツイート投稿
        response = client.create_tweet(text=tweet_text)
        print(f"✓ ツイート投稿成功: {response.data['id']}")
        return True

    except tweepy.TweepyException as e:
        print(f"ツイート投稿エラー: {e}")
        return False


def main():
    """メイン処理"""
    print("=" * 50)
    print("X自動投稿スクリプト")
    print("=" * 50)

    # 記事を読み込み
    articles = load_articles()
    if not articles:
        print("記事がありません")
        return

    print(f"記事数: {len(articles)}件")

    # 投稿済みIDを読み込み
    posted_ids = load_posted_ids()
    print(f"投稿済み: {len(posted_ids)}件")

    # 未投稿の記事を抽出（最新5件まで）
    new_articles = []
    for article in articles:
        article_id = article.get('id', '')
        if article_id and article_id not in posted_ids:
            # 要約が空の記事はスキップ
            summary = article.get('summary', '')
            if summary and not summary.startswith('【要約準備中】'):
                new_articles.append(article)

    print(f"未投稿の新着記事: {len(new_articles)}件")

    if not new_articles:
        print("新着記事はありません")
        return

    # 最新3件のみ投稿（API制限対策）
    articles_to_post = new_articles[:3]

    posted_count = 0
    for article in articles_to_post:
        article_id = article.get('id', '')
        title = article.get('title', '')[:50]

        print(f"\n投稿中: {title}...")

        # ツイート本文を生成
        tweet_text = create_tweet_text(article)
        print(f"ツイート内容:\n{tweet_text}\n")

        # ツイート投稿
        if post_tweet(tweet_text):
            posted_ids.add(article_id)
            posted_count += 1
        else:
            print(f"投稿失敗: {article_id}")
            # エラー時は続行せず終了
            break

    # 投稿済みIDを保存
    save_posted_ids(posted_ids)

    print(f"\n完了: {posted_count}件投稿しました")


if __name__ == "__main__":
    main()
