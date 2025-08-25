from flask import Flask, request, jsonify
from supabase import create_client
from dotenv import load_dotenv
import os

# 🔧 Setup
app = Flask(__name__)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ✅ Signup route
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        telegram_id = data.get("telegram_id")
        discord_id = data.get("discord_id")
        username = data.get("username")

        provider = "telegram" if telegram_id else "discord"
        provider_user_id = discord_id if discord_id else telegram_id
        username = username or f"user_{provider_user_id}"
        email = f"{username}@placeholder.email"

        print("Incoming signup payload:", {
            "telegram_id": telegram_id,
            "discord_id": discord_id,
            "provider_user_id": provider_user_id,
            "username": username,
            "email": email,
            "provider": provider
        })

        query = supabase.table("users").select("id").or_(
            f"telegram_id.eq.{telegram_id},discord_id.eq.{discord_id}"
        ).limit(1).execute()

        if query.data:
            return jsonify({
                "status": "already_exists",
                "user_id": query.data[0]["id"]
            })

        result = supabase.table("users").insert({
            "telegram_id": telegram_id,
            "discord_id": discord_id,
            "provider_user_id": provider_user_id,
            "username": username,
            "email": email,
            "provider": provider,
            "is_bot_user": True,
            "is_anonymous": False
        }).execute()

        return jsonify({
            "status": "created",
            "user_id": result.data[0]["id"]
        })

    except Exception as e:
        print("Signup error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

# 🚀 Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
