import os
from supabase import create_client
from dotenv import load_dotenv
from database import fetch_one, fetch_all, insert

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Supabase client initialized.")

def supabase_upsert_user(telegram_id: str, name: str):
    data = {
        "id": telegram_id,
        "name": name,
        "source": "telegram"
    }
    supabase.table("profiles").upsert(data, on_conflict=["id"]).execute()
