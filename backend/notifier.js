// backend/notifier.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// 🔍 Get Telegram ID from Supabase
async function getTelegramId(user_id) {
  const url = `${SUPABASE_URL}/rest/v1/telegram_users?select=telegram_id&user_id=eq.${user_id}`;
  const resp = await axios.get(url, { headers });
  return resp.data[0]?.telegram_id || null;
}

// 📬 Send Telegram DM
async function sendTelegramDM(user_id, message) {
  const telegram_id = await getTelegramId(user_id);
  if (!telegram_id) return;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: telegram_id,
    text: message
  });
}

// 🔔 Notification Dispatcher
app.post('/notify', async (req, res) => {
  const { user_id, event, data } = req.body;

  let message = '';
  switch (event) {
    case 'referral:new':
      message = `📬 New referral submitted: ${data?.client_codename || 'Unnamed'}!`;
      break;
    case 'referral:update':
      message = `📢 Referral status updated to: ${data?.status || 'Unknown'}`;
      break;
    case 'payout:sent':
      message = `💰 Payout of ₹${data?.amount || '—'} sent!`;
      break;
    case 'leaderboard:update':
      message = `🏆 You’ve moved up the leaderboard!`;
      break;
    default:
      return res.status(400).send('Unknown event');
  }

  await sendTelegramDM(user_id, message);
  res.send('Notification sent');
});

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Notifier running on port ${PORT}`);
});
