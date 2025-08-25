import sys
import os
sys.path.append(os.path.dirname(__file__))

from typing import Optional
from db import fetch_all

def get_referrals_by_user(user_id: str):
    """
    Returns all users referred by the given user.
    """
    return fetch_all(
        table="users",
        filters={"referrer_id": user_id},
        columns="email"
    )

# 🔹 Test block (can be removed later)
if __name__ == "__main__":
    referrer_id = "fc79b08a-6bdb-4f59-bcd8-cb6f929744f4"
    referrals = get_referrals_by_user(referrer_id)
    print("Referrals for Sowmiya:", referrals)
