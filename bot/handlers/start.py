from telegram import Update
from telegram.ext import ContextTypes
from supabase_client import supabase_upsert_user

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    telegram_id = str(user.id)
    name = user.full_name

    # Upsert user into Supabase
    supabase_upsert_user(telegram_id, name)

    await update.message.reply_text(
        f"👋 Hi {name}! Welcome to the referral bot.\nUse /refer to invite others."
    )
