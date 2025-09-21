from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
import httpx
import urllib.parse

# ==============================
# Hardcoded Discord OAuth2 Config
# ==============================
DISCORD_CLIENT_ID = "1402573113996349480"
DISCORD_CLIENT_SECRET = "J4dwpd_LENLjJbFdQoGiiMXt-KegIM4-"
DISCORD_REDIRECT_URI = "https://nilzboeucxwegmtptyss.supabase.co/auth/v1/callback"

DISCORD_API_BASE = "https://discord.com/api"
DISCORD_AUTHORIZE_URL = f"{DISCORD_API_BASE}/oauth2/authorize"
DISCORD_TOKEN_URL = f"{DISCORD_API_BASE}/oauth2/token"
DISCORD_USER_URL = f"{DISCORD_API_BASE}/users/@me"

# ==============================
# Router
# ==============================
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login/discord")
async def login_discord(request: Request):
    """Redirect user to Discord OAuth2 authorization page."""
    params = {
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify email",
    }
    url = f"{DISCORD_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/callback")
async def discord_callback(request: Request, code: str = None, error: str = None):
    """Handle Discord OAuth2 callback."""
    if error:
        return JSONResponse({"error": error}, status_code=400)

    if not code:
        return JSONResponse({"error": "Missing code"}, status_code=400)

    # Step 1: Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_data = {
            "client_id": DISCORD_CLIENT_ID,
            "client_secret": DISCORD_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": DISCORD_REDIRECT_URI,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        token_response = await client.post(DISCORD_TOKEN_URL, data=token_data, headers=headers)

        if token_response.status_code != 200:
            return JSONResponse(
                {"error": "Failed to get token", "details": token_response.json()},
                status_code=token_response.status_code,
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

    # Step 2: Fetch user info from Discord
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            DISCORD_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch user info", "details": user_response.json()},
                status_code=user_response.status_code,
            )

        user_json = user_response.json()

    # For now, just return the user info
    return {"discord_user": user_json}
