#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
編集部ピックアップ生成スクリプト
Gemini AIを使用して、特別支援教育に関連性の高い記事を選定し紹介文を生成
"""

import os
import sys
import json
import hashlib
from datetime import datetime
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
from google import genai

# .env.local から環境変数を読み込む
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# APIキーを取得
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("エラー: GEMINI_API_KEY が設定されていません")
    exit(1)

# クライアントを初期化
client = genai.Client(api_key=api_key)

# パス設定
base_dir = os.path.dirname(__file__)
articles_path = os.path.join(base_dir, '..', 'public', 'data', 'articles.json')
output_path = os.path.join(base_dir, '..', 'public', 'data', 'ai-picks.json')

# articles.json を読み込む
with open(articles_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

articles = data.get('articles', [])
print(f"読み込んだ記事数: {len(articles)}件")
print("-" * 50)

# ニュースのタイトルとURLをリスト化（インデックス付き）
news_list = []
article_map = {}  # 番号→記事のマッピング
for i, article in enumerate(articles[:30], 1):  # 最新30件から選定
    news_list.append(f"{i}. 【{article.get('source', '')}】{article['title']}\n   概要: {article.get('summary', '')[:80]}...")
    article_map[i] = article

news_text = "\n".join(news_list)

# 厳格なプロンプトを作成
prompt = f"""あなたは「インクルーシブ教育ナビ」の編集者です。
以下の教育関連ニュース一覧から、**特別支援教育・インクルーシブ教育に直接関連する記事のみ** を厳選してください。

## 選定基準（重要）

### 優先的に選ぶべき記事:
1. **特別支援教育の制度・政策に関するもの**（文科省の通知、ガイドライン改定など）
2. **インクルーシブ教育の実践事例**（学校での具体的な取り組み、合理的配慮の事例）
3. **発達障害・学習障害に関する教育的支援**（指導法、教材、研究成果）
4. **特別支援教育に関わる教員・保護者向け情報**（研修、セミナー、相談窓口）
5. **障害のある子どもの学びを支援するICT・教材**

### 選ばないでほしい記事:
- 一般的な受験情報（中学受験、高校受験の倍率など）
- 特別支援教育と直接関係のない教育ニュース
- 大学ランキングなど進学情報のみの記事

## ニュース一覧

{news_text}

## 出力形式

上記の基準に基づき、特別支援教育に関心の高い保護者・教員に **本当に役立つ** 記事を **3つ** 選んでください。
選定基準に合う記事がない場合は、最も関連性の高いものを選んでください。

以下のJSON形式で出力してください（他の説明文は不要）：
```json
{{
  "picks": [
    {{
      "number": 選んだニュースの番号（数字のみ）,
      "reason": "選んだ理由（15〜20文字程度、例：『合理的配慮の実践例』）",
      "summary": "特別支援教育の観点からの紹介文（80〜120文字程度。この記事がなぜ保護者や教員に役立つのかを説明）"
    }}
  ]
}}
```"""

print("Gemini APIに問い合わせ中...")
print("-" * 50)

# Gemini APIに問い合わせ
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

response_text = response.text
print("【AIの回答】")
print(response_text)
print("-" * 50)

# JSONを抽出してパース
try:
    # ```json ... ``` の中身を抽出
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0].strip()
    else:
        json_str = response_text.strip()

    ai_response = json.loads(json_str)
    picks = ai_response.get('picks', [])

    # 出力用データを作成
    output_picks = []
    for pick in picks:
        num = pick.get('number')
        if num and num in article_map:
            source_article = article_map[num]
            pick_id = hashlib.md5(f"{source_article['id']}-{datetime.now().isoformat()}".encode()).hexdigest()[:12]

            output_pick = {
                "id": pick_id,
                "sourceArticleId": source_article.get('id'),
                "title": source_article.get('title'),
                "url": source_article.get('url'),
                "category": source_article.get('category', ''),
                "originalDate": source_article.get('date', ''),
                "reason": pick.get('reason', ''),
                "summary": pick.get('summary', ''),
                "generatedAt": datetime.now().isoformat(),
                "model": "gemini-2.5-flash"
            }
            output_picks.append(output_pick)
            print(f"✓ 追加: {source_article.get('title')[:40]}...")

    # 既存のai-picks.jsonがあれば読み込む
    existing_picks = []
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            existing_picks = existing_data.get('picks', [])

    # 重複チェック（同じsourceArticleIdは追加しない）
    existing_ids = {p.get('sourceArticleId') for p in existing_picks}
    new_picks = [p for p in output_picks if p.get('sourceArticleId') not in existing_ids]

    # 新しいピックを先頭に追加
    all_picks = new_picks + existing_picks

    # 最大10件に制限
    all_picks = all_picks[:10]

    # 出力データを作成
    output_data = {
        "picks": all_picks,
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(all_picks)
    }

    # ファイルに保存
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("-" * 50)
    print(f"✓ 保存完了: {output_path}")
    print(f"  - 新規追加: {len(new_picks)}件")
    print(f"  - 合計: {len(all_picks)}件")

except json.JSONDecodeError as e:
    print(f"エラー: AIの回答をJSONとしてパースできませんでした")
    print(f"詳細: {e}")
except Exception as e:
    print(f"エラー: {e}")
