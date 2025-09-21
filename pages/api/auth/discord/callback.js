import axios from "axios";
import cookie from "cookie";

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // Exchange code for token
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI, // ✅ using env
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, token_type } = tokenRes.data;

    // Fetch user info from Discord
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `${token_type} ${access_token}` },
    });

    const user = userRes.data;

    // Get oauth_role from cookie (set before login in index.js)
    const cookies = cookie.parse(req.headers.cookie || "");
    const oauthRole = cookies.oauth_role || "client";

    // Redirect based on role
    if (oauthRole === "admin") {
      res.redirect(
        `/admindash?user=${encodeURIComponent(JSON.stringify(user))}`
      );
    } else {
      res.redirect(
        `/clientdash?user=${encodeURIComponent(JSON.stringify(user))}`
      );
    }
  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to get access token",
      details: err.response?.data || err.message,
    });
  }
}
