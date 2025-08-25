import os
import logging
import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from supabase import create_client, Client
from dotenv import load_dotenv
import uvicorn

# 🔧 Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()
logging.basicConfig(level=logging.INFO)

# ✅ Utility: Get user_id from telegram_users or discord_users
def get_user_id(telegram_id=None, discord_id=None):
    try:
        if telegram_id:
            res = supabase.table("telegram_users").select("user_id").eq("telegram_id", telegram_id).single().execute()
        elif discord_id:
            res = supabase.table("discord_users").select("user_id").eq("discord_id", discord_id).single().execute()
        else:
            return None
        return res.data["user_id"] if res.data else None
    except Exception as e:
        logging.warning(f"User lookup failed: {e}")
        return None

# ✅ Utility: Get discord_id from user_id
def get_discord_id(user_id):
    try:
        res = supabase.table("discord_users").select("discord_id").eq("user_id", user_id).single().execute()
        return res.data["discord_id"] if res.data else None
    except Exception as e:
        logging.warning(f"Discord ID lookup failed: {e}")
        return None

# ✅ Utility: Send Discord DM
def send_discord_notification(discord_id, message):
    url = "https://discord.com/api/v10/users/@me/channels"
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    try:
        dm_resp = requests.post(url, json={"recipient_id": discord_id}, headers=headers)
        if not dm_resp.ok:
            logging.warning(f"DM channel creation failed: {dm_resp.text}")
            return
        channel_id = dm_resp.json()["id"]
        msg_url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
        msg_resp = requests.post(msg_url, json={"content": message}, headers=headers)
        if msg_resp.ok:
            logging.info(f"✅ DM sent to {discord_id}")
        else:
            logging.warning(f"DM send failed: {msg_resp.text}")
    except Exception as e:
        logging.error(f"Discord DM error: {e}")

# ✅ Onboard user
@app.post("/signup")
async def signup(request: Request):
    body = await request.json()
    telegram_id = body.get("telegram_id")
    discord_id = body.get("discord_id")

    try:
        user_id = get_user_id(telegram_id, discord_id)
        if user_id:
            return JSONResponse(content={"status": "already_exists", "user_id": user_id})

        result = supabase.table("users").insert({
            "earned_xp": 0,
            "milestone_level": 0,
            "badge": None
        }).select("id").single().execute()
        new_user_id = result.data["id"]

        if telegram_id:
            supabase.table("telegram_users").insert({
                "telegram_id": telegram_id,
                "user_id": new_user_id
            }).execute()
        elif discord_id:
            supabase.table("discord_users").insert({
                "discord_id": discord_id,
                "user_id": new_user_id
            }).execute()

        return JSONResponse(content={"status": "created", "user_id": new_user_id})

    except Exception as e:
        logging.error(f"Signup error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# ✅ Submit referral
@app.post("/refer")
async def refer(request: Request):
    body = await request.json()
    telegram_id = body.get("telegram_id")
    discord_id = body.get("discord_id")
    client_codename = body.get("client_codename")

    try:
        user_id = get_user_id(telegram_id, discord_id)
        if not user_id:
            return JSONResponse(content={"status": "not_found"}, status_code=404)

        supabase.table("referrals").insert({
            "referrer_id": user_id,
            "client_codename": client_codename,
            "status": "Just Referred"
        }).execute()

        # XP logic
        user_res = supabase.table("users").select("earned_xp").eq("id", user_id).single().execute()
        current_xp = user_res.data.get("earned_xp", 0)
        new_xp = current_xp + 10
        level, badge, milestone_msg = 0, None, None
        if new_xp >= 100: level, badge, milestone_msg = 3, "🏆", "💯 XP milestone reached!"
        elif new_xp >= 50: level, badge, milestone_msg = 2, "🥇", "🎉 50 XP milestone!"
        elif new_xp >= 10: level, badge, milestone_msg = 1, "🌱", "🌱 First milestone!"

        supabase.table("users").update({
            "earned_xp": new_xp,
            "milestone_level": level,
            "badge": badge
        }).eq("id", user_id).execute()

        if discord_id:
            msg = f"✅ Referral submitted for `{client_codename}`! You earned 10 XP."
            if milestone_msg:
                msg += f"\n{milestone_msg}"
            send_discord_notification(discord_id, msg)

        return JSONResponse(content={"status": "success", "message": "Referral recorded."})

    except Exception as e:
        logging.error(f"Refer error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# ✅ Update referral status
@app.post("/update_status")
async def update_status(request: Request):
    body = await request.json()
    discord_id = body.get("discord_id")
    client_codename = body.get("client_codename")
    new_status = body.get("new_status")

    xp_map = {
        "Milestone Achieved": 30,
        "Client Paid": 50
    }

    try:
        user_id = get_user_id(discord_id=discord_id)
        if not user_id:
            return JSONResponse(content={"status": "not_found"}, status_code=404)

        supabase.table("referrals").update({
            "status": new_status
        }).eq("referrer_id", user_id).eq("client_codename", client_codename).execute()

        xp_gain = xp_map.get(new_status, 0)
        user_res = supabase.table("users").select("earned_xp").eq("id", user_id).single().execute()
        current_xp = user_res.data.get("earned_xp", 0)
        new_xp = current_xp + xp_gain
        level, badge, milestone_msg = 0, None, None
        if new_xp >= 100: level, badge, milestone_msg = 3, "🏆", "💯 XP milestone reached!"
        elif new_xp >= 50: level, badge, milestone_msg = 2, "🥇", "🎉 50 XP milestone!"
        elif new_xp >= 10: level, badge, milestone_msg = 1, "🌱", "🌱 First milestone!"

        supabase.table("users").update({
            "earned_xp": new_xp,
            "milestone_level": level,
            "badge": badge
        }).eq("id", user_id).execute()

        msg = f"📈 Referral `{client_codename}` updated to `{new_status}`. You earned {xp_gain} XP."
        if milestone_msg:
            msg += f"\n{milestone_msg}"
        send_discord_notification(discord_id, msg)

        return JSONResponse(content={"status": "updated", "xp_added": xp_gain})

    except Exception as e:
        logging.error(f"Update status error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# ✅ Update user status + trigger Discord DM
@app.post("/status")
async def update_status(request: Request):
    try:
        payload = await request.json()
        user_id = payload.get("user_id")
        status = payload.get("status")

        if not user_id or not status:
            raise ValueError("Missing user_id or status")

        # Update status in DB (replace with actual Supabase logic)
        result = await update_user_status(user_id, status)

        # Lookup Discord ID and send notification
        discord_id = get_discord_id(user_id)
        if discord_id:
            msg = f"🛠️ Your status was updated to `{status}`."
            send_discord_notification(discord_id, msg)

        logging.info(f"Status updated for user {user_id}: {status}")
        return JSONResponse(content={"status": "success", "user_id": user_id, "status": status})

    except Exception as e:
        logging.error(f"Status error: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# ✅ Mocked DB update function (replace with actual Supabase logic)
async def update_user_status(user_id: str, status: str):
    try:
        supabase.table("users").update({
            "status": status
        }).eq("id", user_id).execute()
        logging.debug(f"DB updated for user {user_id} with status {status}")
        return True
    except Exception as e:
        logging.error(f"DB update failed: {e}")
        return False

# ✅ Optional: Run with Uvicorn if needed
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
