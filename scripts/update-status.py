#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ステータス更新スクリプト
status.jsonのAPI使用量を再計算して更新する
- 17:00 JSTリセット対応
- 手動投稿後のステータス更新用
"""

import os
import sys
import json
from datetime import datetime, timedelta

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
STATUS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "status.json")

DAILY_API_LIMIT = 20


def get_quota_period_start():
    """現在のクォータ期間の開始時刻を取得（17:00 JSTでリセット）"""
    now = datetime.now()
    today_reset = now.replace(hour=17, minute=0, second=0, microsecond=0)

    if now >= today_reset:
        return today_reset
    else:
        return today_reset - timedelta(days=1)


def update_status(api_calls: int = 0, articles_processed: int = 0, success: bool = True, add_history: bool = False, is_manual: bool = False):
    """ステータスを更新（API使用量を再計算）"""
    try:
        # 既存のステータスを読み込み
        existing_status = {"history": []}
        if os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, 'r', encoding='utf-8') as f:
                existing_status = json.load(f)

        now = datetime.now()
        quota_period_start = get_quota_period_start()

        # クォータ期間内のAPI使用量を集計
        period_api_usage = api_calls  # 今回の呼び出し分
        for entry in existing_status.get("history", []):
            try:
                entry_time = datetime.fromisoformat(entry.get("timestamp", ""))
                if entry_time >= quota_period_start:
                    period_api_usage += entry.get("apiCalls", 0)
            except:
                continue

        api_percentage = min(100, int((period_api_usage / DAILY_API_LIMIT) * 100))

        # ステータスデータを構築
        status_data = {
            "lastUpdated": now.isoformat(),
            "apiUsage": {
                "used": period_api_usage,
                "limit": DAILY_API_LIMIT,
                "percentage": api_percentage
            },
            "lastRun": existing_status.get("lastRun", {
                "timestamp": now.isoformat(),
                "articlesProcessed": 0,
                "articlesAdded": 0,
                "apiCalls": 0,
                "success": True,
                "error": None
            }),
            "history": existing_status.get("history", [])
        }

        # 履歴に追加する場合（手動投稿時など）
        if add_history and (api_calls > 0 or articles_processed > 0):
            status_data["lastRun"] = {
                "timestamp": now.isoformat(),
                "articlesProcessed": articles_processed,
                "articlesAdded": articles_processed,
                "apiCalls": api_calls,
                "success": success,
                "error": None,
                "isManual": is_manual
            }
            status_data["history"] = existing_status.get("history", [])[-23:] + [{
                "timestamp": now.isoformat(),
                "articlesProcessed": articles_processed,
                "apiCalls": api_calls,
                "success": success,
                "isManual": is_manual
            }]

        # ファイルに保存
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(STATUS_FILE, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, ensure_ascii=False, indent=2)

        print(f"ステータス更新完了")
        print(f"  クォータ期間開始: {quota_period_start.strftime('%Y-%m-%d %H:%M')}")
        print(f"  API使用量: {period_api_usage}/{DAILY_API_LIMIT} ({api_percentage}%)")
        print(f"  残り: {DAILY_API_LIMIT - period_api_usage}回")

        return True

    except Exception as e:
        print(f"ステータス更新エラー: {e}")
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description='ステータス更新スクリプト')
    parser.add_argument('--api-calls', type=int, default=0, help='今回のAPI呼び出し回数')
    parser.add_argument('--articles', type=int, default=0, help='処理した記事数')
    parser.add_argument('--add-history', action='store_true', help='履歴に追加する')
    parser.add_argument('--manual', action='store_true', help='手動投稿の場合')

    args = parser.parse_args()

    success = update_status(
        api_calls=args.api_calls,
        articles_processed=args.articles,
        add_history=args.add_history,
        is_manual=args.manual
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
