#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Analytics 4 データ取得スクリプト
GA4 Data APIからアクセス解析データを取得し、analytics.jsonに保存
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
ANALYTICS_FILE = os.path.join(PROJECT_ROOT, "public", "data", "analytics.json")

# GA4設定
GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "524851962")


def fetch_analytics_data():
    """GA4 Data APIからデータを取得"""
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            RunReportRequest,
            DateRange,
            Dimension,
            Metric,
            FilterExpression,
            Filter,
        )
    except ImportError:
        print("google-analytics-data パッケージがインストールされていません")
        print("pip install google-analytics-data でインストールしてください")
        return None

    try:
        # サービスアカウント認証（GOOGLE_APPLICATION_CREDENTIALS環境変数を使用）
        client = BetaAnalyticsDataClient()
        property_id = f"properties/{GA4_PROPERTY_ID}"

        # 過去30日間のデータを取得
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)

        # 基本指標の取得
        basic_request = RunReportRequest(
            property=property_id,
            date_ranges=[DateRange(start_date=start_date.strftime("%Y-%m-%d"), end_date=end_date.strftime("%Y-%m-%d"))],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="totalUsers"),
                Metric(name="sessions"),
            ],
        )
        basic_response = client.run_report(basic_request)

        page_views = 0
        users = 0
        sessions = 0
        if basic_response.rows:
            row = basic_response.rows[0]
            page_views = int(row.metric_values[0].value)
            users = int(row.metric_values[1].value)
            sessions = int(row.metric_values[2].value)

        # クリックイベントの取得（affiliate_click）
        clicks = {"amazon": 0, "rakuten": 0, "ofuse": 0}
        try:
            click_request = RunReportRequest(
                property=property_id,
                date_ranges=[DateRange(start_date=start_date.strftime("%Y-%m-%d"), end_date=end_date.strftime("%Y-%m-%d"))],
                dimensions=[Dimension(name="customEvent:affiliate_type")],
                metrics=[Metric(name="eventCount")],
                dimension_filter=FilterExpression(
                    filter=Filter(
                        field_name="eventName",
                        string_filter=Filter.StringFilter(value="affiliate_click"),
                    )
                ),
            )
            click_response = client.run_report(click_request)
            for row in click_response.rows:
                affiliate_type = row.dimension_values[0].value.lower()
                count = int(row.metric_values[0].value)
                if affiliate_type in clicks:
                    clicks[affiliate_type] = count
                elif affiliate_type == "buymeacoffee":
                    clicks["ofuse"] = count
        except Exception as e:
            print(f"クリックイベント取得エラー（無視して続行）: {e}")

        # シェアイベントの取得
        shares = {"x": 0, "line": 0}
        try:
            share_request = RunReportRequest(
                property=property_id,
                date_ranges=[DateRange(start_date=start_date.strftime("%Y-%m-%d"), end_date=end_date.strftime("%Y-%m-%d"))],
                dimensions=[Dimension(name="customEvent:method")],
                metrics=[Metric(name="eventCount")],
                dimension_filter=FilterExpression(
                    filter=Filter(
                        field_name="eventName",
                        string_filter=Filter.StringFilter(value="share"),
                    )
                ),
            )
            share_response = client.run_report(share_request)
            for row in share_response.rows:
                method = row.dimension_values[0].value.lower()
                count = int(row.metric_values[0].value)
                if method == "twitter":
                    shares["x"] = count
                elif method == "line":
                    shares["line"] = count
        except Exception as e:
            print(f"シェアイベント取得エラー（無視して続行）: {e}")

        # 人気ページの取得
        top_pages = []
        try:
            pages_request = RunReportRequest(
                property=property_id,
                date_ranges=[DateRange(start_date=start_date.strftime("%Y-%m-%d"), end_date=end_date.strftime("%Y-%m-%d"))],
                dimensions=[Dimension(name="pagePath")],
                metrics=[Metric(name="screenPageViews")],
                order_bys=[{"metric": {"metric_name": "screenPageViews"}, "desc": True}],
                limit=10,
            )
            pages_response = client.run_report(pages_request)
            for row in pages_response.rows:
                path = row.dimension_values[0].value
                views = int(row.metric_values[0].value)
                top_pages.append({"path": path, "views": views})
        except Exception as e:
            print(f"人気ページ取得エラー（無視して続行）: {e}")

        return {
            "lastUpdated": datetime.now().isoformat(),
            "period": f"{start_date.strftime('%Y/%m/%d')} - {end_date.strftime('%Y/%m/%d')}",
            "pageViews": page_views,
            "users": users,
            "sessions": sessions,
            "clicks": clicks,
            "shares": shares,
            "topPages": top_pages,
        }

    except Exception as e:
        print(f"GA4 API エラー: {e}")
        return None


def save_analytics(data):
    """アナリティクスデータをJSONファイルに保存"""
    os.makedirs(os.path.dirname(ANALYTICS_FILE), exist_ok=True)
    with open(ANALYTICS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"アナリティクスデータを保存: {ANALYTICS_FILE}")


def main():
    print("=" * 60)
    print("Google Analytics 4 データ取得")
    print("=" * 60)

    # 環境変数チェック
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        print("警告: GOOGLE_APPLICATION_CREDENTIALS が設定されていません")
        print("サービスアカウントキーのパスを設定してください")

        # ダミーデータを作成（API未設定時）
        dummy_data = {
            "lastUpdated": datetime.now().isoformat(),
            "period": "データ取得待ち",
            "pageViews": 0,
            "users": 0,
            "sessions": 0,
            "clicks": {"amazon": 0, "rakuten": 0, "ofuse": 0},
            "shares": {"x": 0, "line": 0},
            "topPages": [],
        }
        save_analytics(dummy_data)
        return

    data = fetch_analytics_data()
    if data:
        save_analytics(data)
        print(f"  ページビュー: {data['pageViews']}")
        print(f"  ユーザー数: {data['users']}")
        print(f"  セッション: {data['sessions']}")
    else:
        print("データ取得に失敗しました")
        sys.exit(1)


if __name__ == "__main__":
    main()
