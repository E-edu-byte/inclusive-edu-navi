#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API消費チェッカー
構築作業を行う前にこのスクリプトを実行して、API枠を確認

使用方法:
  python scripts/check-quota.py
  python scripts/check-quota.py --need 5  # 5件のAPI呼び出しが必要な場合
"""

import json
import os
import sys
import io
from datetime import datetime, timedelta, timezone

# Windows環境での文字化け対策
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
STATUS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "status.json")

# API制限設定
DAILY_API_LIMIT = 20
ROUTINE_RESERVED = 11  # 朝刊5 + 夕刊6
CONSTRUCTION_AVAILABLE = DAILY_API_LIMIT - ROUTINE_RESERVED  # 9件

def get_jst_now():
    """日本時間の現在時刻を取得"""
    # UTCから+9時間
    return datetime.now(timezone.utc) + timedelta(hours=9)

def get_reset_time():
    """次のリセット時刻（17:00 JST）を取得"""
    now = get_jst_now()
    reset_today = now.replace(hour=17, minute=0, second=0, microsecond=0)

    if now >= reset_today:
        # 今日のリセット時刻を過ぎている場合、明日のリセット時刻
        return reset_today + timedelta(days=1)
    else:
        return reset_today

def load_status():
    """status.jsonを読み込む"""
    if not os.path.exists(STATUS_FILE):
        return None
    with open(STATUS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def calculate_used_today(status):
    """今日（現在のクォータ期間）のAPI使用量を計算"""
    if not status:
        return 0

    now = get_jst_now()
    reset_time = get_reset_time()
    # クォータ期間の開始時刻（前回のリセット時刻）
    period_start = reset_time - timedelta(days=1)

    # historyから該当期間の使用量を集計
    total_used = 0
    for entry in status.get('history', []):
        try:
            timestamp = datetime.fromisoformat(entry.get('timestamp', ''))
            # JSTに変換（タイムスタンプがUTCの場合）
            if timestamp.tzinfo is None:
                # ナイーブな日時の場合、JSTと仮定
                entry_time = timestamp
            else:
                entry_time = timestamp + timedelta(hours=9)

            # 期間内のエントリを集計
            if period_start <= entry_time < reset_time:
                total_used += entry.get('apiCalls', 0)
        except:
            continue

    # 最新の実行も含める
    last_run = status.get('lastRun', {})
    try:
        last_timestamp = datetime.fromisoformat(last_run.get('timestamp', ''))
        if period_start <= last_timestamp < reset_time:
            # historyに含まれていない場合のみ追加
            if last_run.get('timestamp') not in [h.get('timestamp') for h in status.get('history', [])]:
                total_used += last_run.get('apiCalls', 0)
    except:
        pass

    return total_used

def check_quota(needed_calls=0):
    """API残量をチェック"""
    status = load_status()

    now = get_jst_now()
    reset_time = get_reset_time()
    time_until_reset = reset_time - now
    hours_until_reset = time_until_reset.total_seconds() / 3600

    # 今日の使用量
    used_today = status.get('apiUsage', {}).get('used', 0) if status else 0

    # 残り使用可能量
    remaining = DAILY_API_LIMIT - used_today

    # 構築作業に使える量（ルーティン予約を除く）
    # 次のルーティン実行までに必要な枠を計算
    routine_needed = 0
    if now.hour < 7:
        routine_needed = 11  # 朝刊5 + 夕刊6
    elif now.hour < 17:
        routine_needed = 6   # 夕刊6のみ（朝刊は終了）
    elif now.hour < 18:
        routine_needed = 6   # 夕刊6
    else:
        routine_needed = 5   # 朝刊5（次の日）

    construction_available = max(0, remaining - routine_needed)

    print("=" * 60)
    print("【Gemini API 残量チェック】")
    print("=" * 60)
    print(f"現在時刻 (JST): {now.strftime('%Y-%m-%d %H:%M')}")
    print(f"リセット時刻:    {reset_time.strftime('%Y-%m-%d %H:%M')} JST")
    print(f"リセットまで:    {int(hours_until_reset)}時間{int((hours_until_reset % 1) * 60)}分")
    print()
    print(f"【API使用状況】")
    print(f"  1日の上限:     {DAILY_API_LIMIT}件")
    print(f"  使用済み:      {used_today}件")
    print(f"  残り:          {remaining}件")
    print()
    print(f"【内訳】")
    print(f"  ルーティン予約: {routine_needed}件（次回実行分）")
    print(f"  構築作業可能:  {construction_available}件")
    print("-" * 60)

    if needed_calls > 0:
        print()
        print(f"【リクエスト確認】必要API数: {needed_calls}件")
        if needed_calls <= construction_available:
            print(f"[OK] 実行可能です")
            return True
        else:
            print(f"[NG] ルーティンAPI消費を考慮して、制限解除まで")
            print(f"     この作業はできません")
            print()
            print(f"  不足: {needed_calls - construction_available}件")
            print(f"  リセット後に実行してください: {reset_time.strftime('%Y-%m-%d %H:%M')} JST")
            return False

    return construction_available > 0

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='API残量チェッカー')
    parser.add_argument('--need', type=int, default=0, help='必要なAPI呼び出し数')
    args = parser.parse_args()

    result = check_quota(args.need)
    sys.exit(0 if result else 1)
