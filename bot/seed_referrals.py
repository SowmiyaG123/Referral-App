import sys
import os
import uuid
from datetime import datetime, timezone
sys.path.append(os.path.dirname(__file__))

from db import insert

def generate_user_payload(referrer_id=None):
    return {
        "id": str(uuid.uuid4()),
        "provider": "email",
        "provider_user_id": str(uuid.uuid4()),
        "telegram_id": str(uuid.uuid4().int)[:9],  # Simulated numeric string
        "referral_code": str(uuid.uuid4()),
        "is_anonymous": False,
        **({"referrer_id": referrer_id} if referrer_id else {})
    }

# 🔹 Step 1: Insert referrer user
referrer_payload = generate_user_payload()
insert("users", referrer_payload)
print(f"✅ Referrer inserted: {referrer_payload['id']}")

# 🔹 Step 2: Insert test user with valid referrer_id
test_user_payload = generate_user_payload(referrer_id=referrer_payload["id"])
insert("users", test_user_payload)
print(f"✅ Test user inserted: {test_user_payload['id']} with referrer_id: {referrer_payload['id']}")
