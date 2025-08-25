import requests
import json

BASE_URL = "http://localhost:5000/signup"

def test_signup(payload, label):
    print(f"\n🔹 Test: {label}")
    response = requests.post(BASE_URL, json=payload)
    print("Request Payload:", json.dumps(payload, indent=2))
    print("Response:", response.status_code, response.json())

if __name__ == "__main__":
    # Test 1: Telegram-only user
    test_signup({
        "telegram_id": "tg_106",
        "username": "sowmiyag"
    }, "Telegram-only user")

    # Test 2: Discord-only user
    test_signup({
        "discord_id": "1402572034088894548",
        "username": "sowmiyag123"
    }, "Discord-only user")

    # Test 3: Duplicate Telegram user
    test_signup({
        "telegram_id": "tg_106",
        "username": "sowmiyag"
    }, "Duplicate Telegram user")

    # Test 4: Duplicate Discord user
    test_signup({
        "discord_id": "1402572034088894548",
        "username": "sowmiyag123"
    }, "Duplicate Discord user")

    # Test 5: Auto-generated username
    test_signup({
        "telegram_id": "tg_999"
    }, "Auto-generated username")

    # Test 6: Both IDs present
    test_signup({
        "telegram_id": "tg_777",
        "discord_id": "discord_777",
        "username": "hybrid_user"
    }, "Telegram + Discord hybrid user")
