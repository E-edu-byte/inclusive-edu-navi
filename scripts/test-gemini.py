import os
import sys
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

# 質問を送信
prompt = "特別支援教育の重要性について、30文字程度で短く教えて"
print(f"質問: {prompt}")
print("-" * 40)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)
print(f"回答: {response.text}")
