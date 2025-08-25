import os
import requests
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def get_user_id(telegram_id):
    url = f"{SUPABASE_URL}/rest/v1/telegram_users?select=user_id&telegram_id=eq.{telegram_id}"
    resp = requests.get(url, headers=headers)
    return resp.json()[0]["user_id"] if resp.ok and resp.json() else None

def get_telegram_id(user_id):
    url = f"{SUPABASE_URL}/rest/v1/telegram_users?select=telegram_id&user_id=eq.{user_id}"
    resp = requests.get(url, headers=headers)
    return resp.json()[0]["telegram_id"] if resp.ok and resp.json() else None

def send_dm(user_id, message):
    telegram_id = get_telegram_id(user_id)
    if not telegram_id:
        return
    requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        json={"chat_id": telegram_id, "text": message}
    )

def get_dashboard(user_id):
    url = f"{SUPABASE_URL}/rest/v1/users?select=earned_xp,milestone_level,badge&id=eq.{user_id}"
    resp = requests.get(url, headers=headers)
    if resp.ok and resp.json():
        data = resp.json()[0]
        return (
            f"📊 *Your Dashboard*\n"
            f"🏅 XP: {data['earned_xp']}\n"
            f"🎯 Level: {data['milestone_level']}\n"
            f"🔖 Badge: {data['badge'] or 'None'}"
        )
    return "⚠️ Dashboard not found."

def get_leaderboard():
    url = f"{SUPABASE_URL}/rest/v1/users?select=earned_xp,badge&order=earned_xp.desc&limit=5"
    resp = requests.get(url, headers=headers)
    if resp.ok and resp.json():
        lines = ["🏆 *Top Referrers*"]
        medals = ["🥇", "🥈", "🥉", "🏅", "🎖"]
        for i, user in enumerate(resp.json()):
            lines.append(f"{medals[i]} XP: {user['earned_xp']} | Badge: {user['badge'] or 'None'}")
        return "\n".join(lines)
    return "⚠️ Leaderboard unavailable."

def apply_xp(user_id, xp_gain):
    user_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
    user_resp = requests.get(user_url, headers=headers)
    current_xp = user_resp.json()[0]["earned_xp"] if user_resp.ok else 0
    new_xp = current_xp + xp_gain

    level, badge, milestone_msg = 0, None, None
    if new_xp >= 100: level, badge, milestone_msg = 3, "🏆", "💯 XP milestone reached!"
    elif new_xp >= 50: level, badge, milestone_msg = 2, "🥇", "🎉 50 XP milestone!"
    elif new_xp >= 10: level, badge, milestone_msg = 1, "🌱", "🌱 First milestone!"

    requests.patch(user_url, headers=headers, json={
        "earned_xp": new_xp,
        "milestone_level": level,
        "badge": badge
    })

    if milestone_msg:
        send_dm(user_id, f"🎉 *Milestone Unlocked!*\n{milestone_msg}")

    return xp_gain, milestone_msg

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    check_url = f"{SUPABASE_URL}/rest/v1/telegram_users?select=id&telegram_id=eq.{telegram_id}"
    resp = requests.get(check_url, headers=headers)

    if resp.ok and resp.json():
        await update.message.reply_text("✅ You’re already onboarded!")
        return

    insert_url = f"{SUPABASE_URL}/rest/v1/telegram_users"
    requests.post(insert_url, headers=headers, json={"telegram_id": telegram_id})
    await update.message.reply_text("🚀 Welcome aboard! You’ve been onboarded.")

async def refer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📧 Send your friend's codename:")
    context.user_data["awaiting_codename"] = True

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_codename"):
        codename = update.message.text.strip()
        telegram_id = str(update.effective_user.id)
        user_id = get_user_id(telegram_id)

        if not user_id:
            await update.message.reply_text("⚠️ You’re not onboarded.")
            return

        requests.post(f"{SUPABASE_URL}/rest/v1/referrals", headers=headers, json={
            "referrer_id": user_id,
            "client_codename": codename
        })

        xp_gain, milestone_msg = apply_xp(user_id, 10)
        msg = f"✅ Referral submitted!\n🎯 You earned {xp_gain} XP."
        if milestone_msg:
            msg += f"\n{milestone_msg}"
        await update.message.reply_text(msg)
        send_dm(user_id, f"📬 Referral `{codename}` received!\nYou earned {xp_gain} XP.")
        context.user_data["awaiting_codename"] = False

async def dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = get_user_id(str(update.effective_user.id))
    msg = get_dashboard(user_id) if user_id else "⚠️ Not onboarded."
    await update.message.reply_text(msg)

async def leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = get_leaderboard()
    await update.message.reply_text(msg)

async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = get_user_id(str(update.effective_user.id))
    url = f"{SUPABASE_URL}/rest/v1/referrals?select=client_codename,status&referrer_id=eq.{user_id}"
    resp = requests.get(url, headers=headers)
    if resp.ok and resp.json():
        lines = ["📋 *Referral Status*"]
        for r in resp.json():
            lines.append(f"- {r['client_codename']}: {r['status'] or 'Pending'}")
        await update.message.reply_text("\n".join(lines))
    else:
        await update.message.reply_text("⚠️ No referrals found.")

async def update_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("⚠️ Usage: /update_status <codename> <new_status>")
        return

    telegram_id = str(update.effective_user.id)
    user_id = get_user_id(telegram_id)
    if not user_id:
        await update.message.reply_text("⚠️ You’re not onboarded.")
        return

    client_codename = args[0]
    new_status = " ".join(args[1:])
    referral_url = f"{SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.{user_id}&client_codename=eq.{client_codename}"
    patch_resp = requests.patch(referral_url, headers=headers, json={"status": new_status})

    if not patch_resp.ok:
        await update.message.reply_text("❌ Status update failed.")
        return

    xp_map = {
        "Milestone Achieved": 30,
        "Client Paid": 50
    }
    xp_gain, milestone_msg = apply_xp(user_id, xp_map.get(new_status, 0))
    msg = f"📈 Referral `{client_codename}` updated to `{new_status}`.\n🎯 You earned {xp_gain} XP."
    if milestone_msg:
        msg += f"\n{milestone_msg}"
    await update.message.reply_text(msg)

    # 🔔 Direct DM notification
    send_dm(user_id, f"📢 Status for `{client_codename}` updated to `{new_status}`.\nYou earned {xp_gain} XP.")

# 🚀 Bot setup and command registration
app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("refer", refer))
app.add_handler(CommandHandler("dashboard", dashboard))
app.add_handler(CommandHandler("leaderboard", leaderboard))
app.add_handler(CommandHandler("status", status))
app.add_handler(CommandHandler("update_status", update_status))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
app.run_polling()
