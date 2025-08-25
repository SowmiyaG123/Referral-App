# supabase_helpers.py

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def mark_referral_signed_up(referral_id: str):
    """Update referral status to 'Signed Up'."""
    supabase.table("referrals").update({
        "status": "Signed Up"
    }).eq("referral_id", referral_id).execute()
