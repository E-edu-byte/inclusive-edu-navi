#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
既存記事の強制浄化スクリプト
- STRONG_EXCLUDE_KEYWORDSに該当する記事を削除
- CORE_KEYWORDSに該当しない記事を削除
- 7日以上前の記事を削除
"""

import json
import os
import sys
import io
from datetime import datetime, timedelta

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ARTICLES_FILE = os.path.join(PROJECT_ROOT, "public", "data", "articles.json")

# 記事保持日数
ARTICLE_RETENTION_DAYS = 30

# 【コア理念キーワード】これらのいずれかを含む記事のみを保持
CORE_KEYWORDS = [
    # インクルーシブ教育・特別支援教育
    "インクルーシブ", "インクルーシブ教育", "特別支援", "特別支援教育",
    "支援学級", "支援学校", "通級", "通級指導",
    # 発達障害・神経多様性
    "発達障害", "神経多様性", "ニューロダイバーシティ", "脳機能",
    "学習障害", "LD", "ディスレクシア", "読み書き困難",
    "ADHD", "注意欠如", "多動性",
    "自閉症", "自閉スペクトラム", "ASD", "アスペルガー",
    # ギフテッド・2e
    "ギフテッド", "特異な才能", "2e", "二重の特別", "高IQ", "過度激動", "OE",
    # 合理的配慮・支援
    "合理的配慮", "個別支援", "個別の教育支援計画", "IEP",
    "ユニバーサルデザイン", "UDL", "医療的ケア", "療育",
    # 不登校・多様な学び
    "不登校", "不登校支援", "フリースクール", "多様な学び", "オルタナティブ教育",
    # 障害全般（教育文脈）
    "障害児", "障がい児", "障害のある子", "障がいのある子",
]

# 【強力な除外キーワード】これらを含む記事は即座に破棄
STRONG_EXCLUDE_KEYWORDS = [
    # 政治・情勢
    "首相", "大統領", "会談", "総選挙", "政党", "過半数", "解雇", "辞任",
    "国会", "与党", "野党", "閣僚", "大臣", "衆議院", "参議院",
    "ゼレンスキー", "トランプ", "バイデン", "習近平",
    # 一般受験・倍率（「入試」を単独で追加）
    "入試", "高校受験", "大学受験", "中学受験", "入試倍率", "出願状況",
    "解答速報", "合格判定", "偏差値", "共通テスト", "センター試験",
    "志願倍率", "確定志願", "志願状況", "募集人員", "志望校",
    # 塾・予備校
    "塾", "予備校", "進学塾", "学習塾",
    # 一般医療・警報
    "インフルエンザ", "警報発令", "警報再発令", "感染警報",
    "コロナ", "ワクチン", "予防接種",
    # 一般ニュース
    "事業譲渡", "株価", "為替", "経済指標", "決算",
    # スポーツ・芸能
    "甲子園", "高校野球", "プロ野球", "サッカー", "五輪", "オリンピック",
    "芸能", "アイドル", "ドラマ", "映画", "俳優",
    "ホワイトソックス", "移籍", "自主トレ", "野球", "MLB", "NPB",
    # 軍事・国際情勢
    "無人機", "輸出拠点", "ドローン攻撃", "ミサイル", "軍事",
]

# 教育専門ソース（これらからの記事はCORE_KEYWORDSチェックを緩和）
TRUSTED_EDUCATION_SOURCES = [
    "リセマム", "EdTechZine", "こどもとIT",
]


def contains_strong_exclude(title: str, summary: str) -> bool:
    """
    強力除外キーワードを含むかチェック

    【理念優先ルール】
    除外キーワードを含んでいても、コア理念キーワードを同時に含む場合は
    例外的にFalseを返す（採用）
    """
    text = f"{title} {summary}"

    # 除外キーワードを含むかチェック
    has_exclude = any(kw in text for kw in STRONG_EXCLUDE_KEYWORDS)
    if not has_exclude:
        return False  # 除外キーワードなし → 採用

    # 除外キーワードを含むが、コア理念キーワードも含む場合は例外的に採用
    has_core = any(kw in text for kw in CORE_KEYWORDS)
    if has_core:
        return False  # 理念キーワードあり → 例外採用

    # 除外キーワードのみ → 除外
    return True


def contains_core_keyword(title: str, summary: str) -> bool:
    """コア理念キーワードを含むかチェック"""
    text = f"{title} {summary}"
    for keyword in CORE_KEYWORDS:
        if keyword in text:
            return True
    return False


def is_trusted_source(source: str) -> bool:
    """信頼できる教育専門ソースかチェック"""
    for trusted in TRUSTED_EDUCATION_SOURCES:
        if trusted in source:
            return True
    return False


def is_old_article(date_str: str) -> bool:
    """7日以上前の記事かチェック"""
    if not date_str:
        return False

    cutoff_date = datetime.now() - timedelta(days=ARTICLE_RETENTION_DAYS)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d")

    article_date = date_str[:10]  # YYYY-MM-DD形式
    return article_date < cutoff_str


def purge_articles():
    """記事の強制浄化を実行"""
    print("=" * 60)
    print("既存記事の強制浄化を開始")
    print("=" * 60)

    # 記事データを読み込み
    if not os.path.exists(ARTICLES_FILE):
        print(f"エラー: {ARTICLES_FILE} が見つかりません")
        return

    with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    articles = data.get('articles', [])
    original_count = len(articles)
    print(f"浄化前の記事数: {original_count}件")
    print()

    # 浄化処理
    purged_articles = []
    removed_strong = []
    removed_no_core = []
    removed_old = []

    for article in articles:
        title = article.get('title', '')
        summary = article.get('summary', '')
        source = article.get('source', '')
        date = article.get('date', '')

        # 1. 強力除外キーワードチェック
        if contains_strong_exclude(title, summary):
            removed_strong.append(title)
            continue

        # 2. 7日以上前の記事チェック
        if is_old_article(date):
            removed_old.append(title)
            continue

        # 3. コア理念キーワードチェック（信頼ソース以外）
        if not is_trusted_source(source) and not contains_core_keyword(title, summary):
            removed_no_core.append(title)
            continue

        # すべてのチェックをパスした記事を保持
        purged_articles.append(article)

    # 結果表示
    print("【強力除外キーワードで削除】")
    print("-" * 40)
    for title in removed_strong:
        print(f"  × {title[:50]}...")
    print(f"  合計: {len(removed_strong)}件")
    print()

    print("【7日以上前で削除】")
    print("-" * 40)
    for title in removed_old:
        print(f"  × {title[:50]}...")
    print(f"  合計: {len(removed_old)}件")
    print()

    print("【コア理念キーワード不足で削除】")
    print("-" * 40)
    for title in removed_no_core:
        print(f"  × {title[:50]}...")
    print(f"  合計: {len(removed_no_core)}件")
    print()

    # 保存
    final_count = len(purged_articles)
    total_removed = original_count - final_count

    print("=" * 60)
    print(f"浄化結果: {original_count}件 → {final_count}件 ({total_removed}件削除)")
    print("=" * 60)

    if total_removed > 0:
        # 日付でソート（新しい順）
        purged_articles.sort(key=lambda x: x.get('date', ''), reverse=True)

        # 保存データを作成
        output_data = {
            "articles": purged_articles,
            "lastUpdated": datetime.now().isoformat(),
            "totalCount": final_count,
            "sources": list(set(a.get('source', '') for a in purged_articles if a.get('source')))
        }

        # ファイルに保存
        with open(ARTICLES_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"\n[OK] {ARTICLES_FILE} を更新しました")
    else:
        print("\n浄化対象の記事はありませんでした")


if __name__ == "__main__":
    purge_articles()
