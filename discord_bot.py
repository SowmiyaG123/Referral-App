import discord
import requests
import os
import asyncio
import logging
from dotenv import load_dotenv

# 🔧 Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

# 🔧 Discord client setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
client = discord.Client(intents=intents)

# 🔧 Supabase headers
BASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# ✅ Utility: Get user_id from discord_id
def get_user_id(discord_id):
    url = f"{SUPABASE_URL}/rest/v1/discord_users?select=user_id&discord_id=eq.{discord_id}"
    resp = requests.get(url, headers=BASE_HEADERS)
    return resp.json()[0]["user_id"] if resp.ok and resp.json() else None

# ✅ Utility: Check if bot can DM user
def can_dm_user(discord_id):
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    dm_resp = requests.post("https://discord.com/api/v10/users/@me/channels",
                            json={"recipient_id": discord_id}, headers=headers)
    return dm_resp.ok

# ✅ Utility: Send DM to all Discord users with sender attribution
async def send_discord_dm_to_all(message, sender_id=None):
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "Content-Type": "application/json"
    }

    # Get sender's Discord ID from Supabase
    sender_discord_id = None
    try:
        if sender_id:
            res = requests.get(f"{SUPABASE_URL}/rest/v1/discord_users?select=discord_id&user_id=eq.{sender_id}", headers=BASE_HEADERS)
            if res.ok and res.json():
                sender_discord_id = res.json()[0]["discord_id"]
    except Exception as e:
        logging.warning(f"Sender ID lookup failed: {e}")

    # Get sender display name
    sender_name = "Someone"
    try:
        if sender_discord_id:
            user_obj = await client.fetch_user(int(sender_discord_id))
            sender_name = user_obj.name or f"Discord user {sender_discord_id}"
    except Exception as e:
        logging.warning(f"Display name fetch failed: {e}")
        sender_name = f"Discord user {sender_discord_id}" if sender_discord_id else "Someone"

    full_message = f"🔔 Update from {sender_name}:\n{message}"

    # Fetch all Discord users
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/discord_users?select=discord_id", headers=BASE_HEADERS)
        all_users = res.json() if res.ok else []
        for user in all_users:
            discord_id = user["discord_id"]
            dm_resp = requests.post("https://discord.com/api/v10/users/@me/channels",
                                    json={"recipient_id": discord_id}, headers=headers)
            if not dm_resp.ok:
                logging.warning(f"DM channel creation failed for {discord_id}: {dm_resp.text}")
                continue
            channel_id = dm_resp.json()["id"]
            msg_url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
            msg_resp = requests.post(msg_url, json={"content": full_message}, headers=headers)
            if msg_resp.ok:
                logging.info(f"✅ DM sent to {discord_id}")
            else:
                logging.warning(f"DM send failed for {discord_id}: {msg_resp.text}")
    except Exception as e:
        logging.error(f"Failed to fetch Discord users: {e}")

# ✅ Utility: Get progress from users table
def get_progress(user_id):
    url = f"{SUPABASE_URL}/rest/v1/users?select=earned_xp,milestone_level,badge&id=eq.{user_id}"
    resp = requests.get(url, headers=BASE_HEADERS)
    if resp.ok and resp.json():
        data = resp.json()[0]
        return (
            f"🏅 XP: {data['earned_xp']}\n"
            f"🎯 Level: {data['milestone_level']}\n"
            f"🔖 Badge: {data['badge'] or 'None'}"
        )
    return "⚠️ Progress not found."

# ✅ Utility: Get dashboard summary
def get_dashboard(user_id):
    url = f"{SUPABASE_URL}/rest/v1/users?select=earned_xp,milestone_level,badge&id=eq.{user_id}"
    resp = requests.get(url, headers=BASE_HEADERS)
    if resp.ok and resp.json():
        data = resp.json()[0]
        return (
            f"📊 **Your Dashboard**\n"
            f"🏅 XP: `{data['earned_xp']}`\n"
            f"🎯 Level: `{data['milestone_level']}`\n"
            f"🔖 Badge: `{data['badge'] or 'None'}`"
        )
    return "⚠️ Dashboard not found."

# ✅ Utility: Get leaderboard
def get_leaderboard():
    url = f"{SUPABASE_URL}/rest/v1/users?select=earned_xp,badge&order=earned_xp.desc&limit=5"
    resp = requests.get(url, headers=BASE_HEADERS)
    if resp.ok and resp.json():
        lines = ["🏆 **Top Referrers**"]
        for i, user in enumerate(resp.json(), 1):
            lines.append(f"{i}. XP: `{user['earned_xp']}` | Badge: `{user['badge'] or 'None'}`")
        return "\n".join(lines)
    return "⚠️ Leaderboard unavailable."

@client.event
async def on_ready():
    print(f"✅ Logged in as {client.user}")

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    discord_id = str(message.author.id)

    if message.content.lower() == "!start":
        if not can_dm_user(discord_id):
            await message.channel.send("⚠️ I can’t DM you. Please enable DMs from server members.")
            return

        payload = {"discord_id": discord_id}
        check_url = f"{SUPABASE_URL}/rest/v1/discord_users?select=id&discord_id=eq.{discord_id}"
        check_response = requests.get(check_url, headers=BASE_HEADERS)

        if check_response.ok and check_response.json():
            await message.channel.send("✅ You’re already onboarded!")
            return

        insert_url = f"{SUPABASE_URL}/rest/v1/discord_users"
        headers = BASE_HEADERS.copy()
        headers["Prefer"] = "return=minimal"
        response = requests.post(insert_url, headers=headers, json=payload)
        await message.channel.send("✅ You’ve been onboarded!" if response.ok else "❌ Onboarding failed.")

    elif message.content.lower() == "!refer":
        await message.channel.send("📧 Enter your friend's codename:")

        def check(m): return m.author == message.author and m.channel == message.channel
        try:
            msg = await client.wait_for("message", check=check, timeout=30)
            codename = msg.content.strip()
        except Exception:
            await message.channel.send("⏰ Timeout. Try again.")
            return

        user_id = get_user_id(discord_id)
        if not user_id:
            await message.channel.send("⚠️ You’re not onboarded.")
            return

        check_url = f"{SUPABASE_URL}/rest/v1/referrals?select=id&referrer_id=eq.{user_id}&client_codename=eq.{codename}"
        check_resp = requests.get(check_url, headers=BASE_HEADERS)
        if check_resp.ok and check_resp.json():
            await message.channel.send("⚠️ You’ve already referred this codename.")
            return

        referral_url = f"{SUPABASE_URL}/rest/v1/referrals"
        headers = BASE_HEADERS.copy()
        headers["Prefer"] = "return=minimal"
        insert_resp = requests.post(referral_url, headers=headers, json={"referrer_id": user_id, "client_codename": codename})

        if not insert_resp.ok:
            await message.channel.send("❌ Referral failed.")
            return

        user_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
        user_resp = requests.get(user_url, headers=BASE_HEADERS)
        current_xp = user_resp.json()[0]["earned_xp"] if user_resp.ok else 0
        new_xp = current_xp + 10

        level, badge, milestone_msg = 0, None, None
        if new_xp >= 100: level, badge, milestone_msg = 3, "🏆", "💯 XP milestone reached!"
        elif new_x >= 50: level, badge, milestone_msg = 2, "🥇", "🎉 50 XP milestone!"
        elif new_x >= 10: level, badge, milestone_msg = 1, "🌱", "🌱 First milestone!"

        requests.patch(user_url, headers=BASE_HEADERS, json={
            "earned_xp": new_xp,
            "milestone_level": level,
            "badge": badge
        })

        await message.channel.send(f"✅ Referral submitted! You earned 10 XP.")
        if milestone_msg:
            await message.channel.send(milestone_msg)

        notify_msg = f"🎉 Referral accepted for `{codename}`!\nYou earned 10 XP."
        if milestone_msg:
            notify_msg += f"\n{milestone_msg}"
        await send_discord_dm_to_all(notify_msg, sender_id=user_id)

    elif message.content.lower() == "!update_status":
        await message.channel.send("📝 Enter the client's codename:")

        def check(m): return m.author == message.author and m.channel == message.channel
        try:
            codename_msg = await client.wait_for("message", check=check, timeout=30)
            client_codename = codename_msg.content.strip()
        except Exception:
            await message.channel.send("⏰ Timeout. Try again.")
            return

        await message.channel.send("📌 Enter the new status (e.g., `Milestone Achieved`, `Client Paid`):")
        try:
            status_msg = await client.wait_for("message", check=check, timeout=30)
            new_status = status_msg.content.strip()
        except Exception:
            await message.channel.send("⏰ Timeout. Try again.")
            return

        user_id = get_user_id(discord_id)
        if not user_id:
            await message.channel.send("⚠️ You’re not onboarded.")
            return

        referral_url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&client_codename=eq.{client_codename}"
        patch_resp = requests.patch(referral_url, headers=BASE_HEADERS, json={"status": new_status})

        if not patch_resp.ok:
            await message.channel.send("❌ Status update failed.")
            return

        xp_map = {
            "Milestone Achieved": 30,
            "Client Paid": 50
        }
        xp_gain = xp_map.get(new_status, 0)

        user_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
        user_resp = requests.get(user_url, headers=BASE_HEADERS)
        current_xp = user_resp.json()[0]["earned_xp"] if user_resp.ok else 0
        new_xp = current_xp + xp_gain

        level, badge, milestone_msg = 0, None, None
        if new_xp >= 100: level, badge, milestone_msg = 3, "🏆", "💯 XP milestone reached!"
        elif new_xp >= 50: level, badge, milestone_msg = 2, "🥇", "🎉 50 XP milestone!"
        elif new_xp >= 10: level, badge, milestone_msg = 1, "🌱", "🌱 First milestone!"

        requests.patch(user_url, headers=BASE_HEADERS, json={
            "earned_xp": new_xp,
            "milestone_level": level,
            "badge": badge
        })

        await message.channel.send(f"✅ Status updated to `{new_status}`. You earned {xp_gain} XP.")
        if milestone_msg:
            await message.channel.send(milestone_msg)

        notify_msg = f"📈 Referral `{client_codename}` updated to `{new_status}`.\nYou earned {xp_gain} XP."
        if milestone_msg:
            notify_msg += f"\n{milestone_msg}"
        await send_discord_dm_to_all(notify_msg, sender_id=user_id)

    elif message.content.lower() == "!dashboard":
        user_id = get_user_id(discord_id)
        msg = get_dashboard(user_id) if user_id else "⚠️ Not onboarded."
        await message.channel.send(msg)

    elif message.content.lower() == "!leaderboard":
        msg = get_leaderboard()
        await message.channel.send(msg)

    elif message.content.lower() == "!status":
        user_id = get_user_id(discord_id)
        url = f"{SUPABASE_URL}/rest/v1/referrals?select=client_codename,status&referrer_id=eq.{user_id}"
        resp = requests.get(url, headers=BASE_HEADERS)
        if resp.ok and resp.json():
            lines = ["📋 **Referral Status**"]
            for r in resp.json():
                lines.append(f"- {r['client_codename']}: `{r['status'] or 'Pending'}`")
            await message.channel.send("\n".join(lines))
        else:
            await message.channel.send("⚠️ No referrals found.")

    elif message.content.lower() == "!progress":
        user_id = get_user_id(discord_id)
        msg = get_progress(user_id) if user_id else "⚠️ Not onboarded."
        await message.channel.send(msg)

try:
    client.run(DISCORD_BOT_TOKEN)
except KeyboardInterrupt:
    pass
finally:
    loop = asyncio.get_event_loop()
    if not loop.is_closed():
        loop.close()
