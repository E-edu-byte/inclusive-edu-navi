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

## 【絶対厳守】選定基準

### 必ず選ぶべき記事（以下のいずれかに該当するもの）:
1. **不登校支援**に関する記事（フリースクール、オルタナティブ教育、心のケア）
2. **発達障害・学習障害**への教育的支援（ADHD、ASD、LD、読み書き困難）
3. **合理的配慮**の実践事例（試験での配慮、授業での工夫）
4. **特別支援学級・通級指導**に関する記事
5. **障害のある子の学びを支援するICT・支援技術**
6. **通信制高校・多様な学びの選択肢**（不登校経験者の進路など）

### 【絶対に選んではいけない記事】:
- 入試の倍率・出願状況・応募者数のみの記事（例：「〇〇高校 3.2倍」）
- 共通テストの平均点・解説・対策記事
- プログラミング技術解説（Scratch入門、コーディング解説）
- 大学ランキング・偏差値情報
- 一般的な受験勉強法・入試直前対策
- 就活・キャリア情報（特別支援と無関係なもの）

## ニュース一覧

{news_text}

## 出力形式

上記の基準を**厳格に**適用し、特別支援教育・インクルーシブ教育に**直接関連する**記事を **最大3つ** 選んでください。
**基準に合う記事が少ない場合は、1〜2件でも構いません。基準外の記事を無理に選ばないでください。**

以下のJSON形式で出力してください（他の説明文は不要）：
```json
{{
  "picks": [
    {{
      "number": 選んだニュースの番号（数字のみ）,
      "reason": "選んだ理由（15〜20文字程度、例：『不登校支援の新しい選択肢』）",
      "summary": "特別支援教育の観点からの紹介文（80〜120文字程度。この記事がなぜ保護者や教員に役立つのかを説明）"
    }}
  ]
}}
```"""

print("Gemini APIに問い合わせ中...")
print("-" * 50)

# Gemini APIに問い合わせ（エラーハンドリング付き）
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    response_text = response.text
    print("【AIの回答】")
    print(response_text)
    print("-" * 50)
except Exception as api_error:
    print(f"警告: Gemini API呼び出しエラー - {api_error}")
    print("既存のai-picks.jsonを維持します")
    # エラー時は正常終了（既存データを維持）
    exit(0)

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

    # 【変更】既存のピックは保持せず、毎回新規生成に変更
    # これにより、理念に合致しない古い記事が残り続けることを防ぐ
    all_picks = output_picks

    # 最大5件に制限（厳選されたもののみ）
    all_picks = all_picks[:5]

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
    print(f"  - 生成件数: {len(output_picks)}件")
    print(f"  - 保存件数: {len(all_picks)}件")

except json.JSONDecodeError as e:
    print(f"警告: AIの回答をJSONとしてパースできませんでした")
    print(f"詳細: {e}")
    print("既存のai-picks.jsonを維持します")
    # パースエラー時も正常終了（既存データを維持）
    exit(0)
except Exception as e:
    print(f"警告: {e}")
    print("既存のai-picks.jsonを維持します")
    # エラー時も正常終了
    exit(0)
