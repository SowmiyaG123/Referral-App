import os
from supabase import create_client
from dotenv import load_dotenv

# 🔹 Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials.")

# 🔹 Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Supabase client initialized.")

# 🔹 Query helpers

def fetch_all(table: str, filters: dict = None, columns: str = "*"):
    """
    Fetch all rows from a table with optional filters.
    """
    query = supabase.table(table).select(columns)
    if filters:
        for key, value in filters.items():
            query = query.eq(key, value)
    response = query.execute()
    return response.data

def fetch_one(table: str, filters: dict, columns: str = "*"):
    """
    Fetch a single row from a table with filters.
    """
    data = fetch_all(table, filters, columns)
    return data[0] if data else None

def insert(table: str, data: dict):
    """
    Insert a row into a table.
    """
    response = supabase.table(table).insert(data).execute()
    return response.data
