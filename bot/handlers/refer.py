from telegram import Update
from telegram.ext import ContextTypes
from utils import generate_referral_link

async def refer_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    telegram_id = str(user.id)

    referral_link = generate_referral_link(telegram_id)

    await update.message.reply_text(
        f"🔗 Share this link to refer others:\n{referral_link}"
    )
