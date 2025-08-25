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

# ✅ Refer route
@app.route("/refer", methods=["POST"])
def refer():
    try:
        data = request.get_json()
        telegram_id = data.get("telegram_id")
        discord_id = data.get("discord_id")
        client_codename = data.get("client_codename")
        description = data.get("description")

        # Determine ID field and value
        id_field = "telegram_id" if telegram_id else "discord_id"
        user_id_value = telegram_id if telegram_id else discord_id

        # Lookup user
        user_lookup = supabase.table("users").select("id", "username").eq(id_field, user_id_value).limit(1).execute()
        if not user_lookup.data:
            return jsonify({"status": "not_found"})

        user_id = user_lookup.data[0]["id"]
        username = user_lookup.data[0]["username"]

        # Prevent self-referral
        if client_codename == username:
            return jsonify({"status": "error", "message": "Cannot refer yourself"}), 400

        # Check for duplicate referral
        duplicate_check = supabase.table("referrals")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("client_codename", client_codename)\
            .limit(1)\
            .execute()

        if duplicate_check.data:
            return jsonify({"status": "error", "message": "Referral already recorded"}), 409

        # Insert referral
        supabase.table("referrals").insert({
            "user_id": user_id,
            id_field: user_id_value,
            "client_codename": client_codename,
            "description": description,
            "status": "Just Referred"
        }).execute()

        return jsonify({"status": "referral_recorded", "user_id": user_id})

    except Exception as e:
        print("Referral error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500

# 🚀 Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
