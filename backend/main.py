# main.py
import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, Set
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client
import traceback
import time

app = FastAPI()

# ==================== CONFIG ====================
SUPABASE_URL = "https://nilzboeucxwegmtptyss.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbHpib2V1Y3h3ZWdtdHB0eXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTM4NDQsImV4cCI6MjA2OTg2OTg0NH0.faZLav1YMiiGzmab_8AhY3rQKQdFYsJcIiqvdSvajIo"

DISCORD_CLIENT_ID = "1402573113996349480"
DISCORD_CLIENT_SECRET = "PLHDIuHBSC3jPyljmwopmn-B1x3qwVp7"
ADMIN_EMAIL = "admin@relapp.com"
ADMIN_PASSWORD = "admin123"

SMTP_SERVER = "smtp.resend.com"
SMTP_PORT = 465
SMTP_USER = "resend"
SMTP_PASS = "YOUR_SMTP_PASS"
SENDER_EMAIL = "sowmyag.it2022@citchennai.net"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==================== CORS ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend URL in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================
class RegisterRequest(BaseModel):
    email: str
    password: str
    invite: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyRequest(BaseModel):
    email: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    notifications: Optional[bool] = None
    email: Optional[str] = None
    theme: Optional[str] = None  # light/dark

class GenericUpdateRequest(BaseModel):
    data: Dict[str, Any]

# ==================== UTILITIES ====================
def send_verification_email(to_email: str):
    subject = "Verify your account"
    verification_link = f"http://localhost:3000/verify?email={to_email}"
    body = f"""Hi,

Please verify your account by clicking the link below:
{verification_link}

Thanks,
Referral App Team
"""
    try:
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"Verification email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send verification email: {e}")

# Authentication dependency
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header[len("Bearer "):].strip().lower()
    try:
        resp = supabase.from_("users").select("*").eq("email", token).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase query error: {str(e)}")

# Check response object attributes safely
    if hasattr(resp, 'error') and resp.error is not None:
        raise HTTPException(status_code=401, detail=f"Error: {resp.error}")
    if not hasattr(resp, 'data') or resp.data is None:
        raise HTTPException(status_code=401, detail="Invalid token or user not found")


# ==================== HELPERS: schema / column caching ====================
_table_columns_cache: Dict[str, Set[str]] = {}
_table_columns_cache_ts: Dict[str, float] = {}
_CACHE_TTL_SECONDS = 60 * 5  # 5 minutes cache

def get_table_columns(table_name: str) -> Set[str]:
    """
    Return a set of column names for table_name.
    Cache results for performance.
    """
    now = time.time()
    if table_name in _table_columns_cache and (now - _table_columns_cache_ts.get(table_name, 0)) < _CACHE_TTL_SECONDS:
        return _table_columns_cache[table_name]

    try:
        q = (
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = %(table)s"
        )
        # Use Supabase SQL RPC via REST? The supabase client doesn't expose raw SQL easily.
        # We'll use the PostgREST RPC endpoint `rpc` is not available; but information_schema is accessible via select via supabase.from_.
        resp = supabase.rpc("sql", {"q": q})  # try-safe call (some supabase clients don't support this)
        # fallback if rpc not available: use information_schema.columns via from_ query
    except Exception:
        # Fallback: query information_schema.columns via the table exposed by PostgREST
        try:
            resp = supabase.from_("information_schema.columns").select("column_name").eq("table_name", table_name).execute()
            if resp.error:
                raise
            cols = {r["column_name"] for r in resp.data}
            _table_columns_cache[table_name] = cols
            _table_columns_cache_ts[table_name] = now
            return cols
        except Exception:
            # Final fallback: hard-coded common columns (safe fallback)
            fallback = {"id", "created_at", "updated_at"}
            _table_columns_cache[table_name] = fallback
            _table_columns_cache_ts[table_name] = now
            return fallback

# Alternative simpler fetch for Postgres schema by using information_schema via supabase.from_
def get_table_columns_simple(table_name: str) -> Set[str]:
    now = time.time()
    if table_name in _table_columns_cache and (now - _table_columns_cache_ts.get(table_name, 0)) < _CACHE_TTL_SECONDS:
        return _table_columns_cache[table_name]
    try:
        resp = supabase.from_("information_schema.columns").select("column_name").eq("table_name", table_name).execute()
        if resp.error:
            raise Exception(resp.error)
        cols = {r["column_name"] for r in resp.data}
        _table_columns_cache[table_name] = cols
        _table_columns_cache_ts[table_name] = now
        return cols
    except Exception:
        # Very conservative set if schema read fails
        cols = {"id", "created_at", "updated_at"}
        _table_columns_cache[table_name] = cols
        _table_columns_cache_ts[table_name] = now
        return cols

# Use the simple function by default
_get_columns = get_table_columns_simple

# ==================== AUTH ====================
@app.get("/")
def read_root():
    return {"message": "Referral App Backend Running ✅"}

@app.post("/register")
def register_user(request: RegisterRequest):
    email = request.email.strip().lower()
    password = request.password.strip()

    if email == ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Cannot register admin user")

    existing = supabase.from_("users").select("email").eq("email", email).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="User already exists")

    user = {
        "email": email,
        "password": password,  # Note: In real app, hash passwords!
        "role": "client",
        "verified": False,
        "invite": request.invite,
        "notifications": True,
    }

    insert_resp = supabase.from_("users").insert(user).execute()
    if insert_resp.error:
        raise HTTPException(status_code=500, detail="Failed to create user")

    send_verification_email(email)
    return {"message": "User registered successfully. Please verify your email.", "user": email}

@app.post("/verify")
def verify_user(request: VerifyRequest):
    email = request.email.strip().lower()
    resp = supabase.from_("users").update({"verified": True}).eq("email", email).execute()
    if resp.error or resp.count == 0:
        raise HTTPException(status_code=404, detail="User not found or already verified")
    return {"message": "Email verified successfully"}

@app.post("/login")
def login_user(request: LoginRequest):
    email = request.email.strip().lower()
    password = request.password.strip()

    resp = supabase.from_("users").select("*").eq("email", email).single().execute()
    if resp.error or not resp.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = resp.data
    if user.get("password") != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("verified", False):
        raise HTTPException(status_code=403, detail="Email not verified")

    return {"message": "Login successful", "user": email, "role": user.get("role", "client")}

@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return {
        "email": user["email"],
        "invite": user.get("invite"),
        "role": user.get("role", "client"),
        "verified": user.get("verified", False),
        "name": user.get("name"),
        "avatar": user.get("avatar"),
        "notifications": user.get("notifications", True),
    }

@app.get("/profile")
def get_profile(user=Depends(get_current_user)):
    return {
        "email": user["email"],
        "name": user.get("name"),
        "avatar": user.get("avatar"),
        "notifications": user.get("notifications", True),
        "role": user.get("role", "client"),
        "verified": user.get("verified", False),
        "theme": user.get("theme", "light")
    }

@app.patch("/profile")
def update_profile(profile_update: ProfileUpdateRequest, user=Depends(get_current_user)):
    update_data = {}
    if profile_update.name is not None:
        update_data["name"] = profile_update.name
    if profile_update.avatar is not None:
        update_data["avatar"] = profile_update.avatar
    if profile_update.notifications is not None:
        update_data["notifications"] = profile_update.notifications
    if profile_update.email is not None:
        update_data["email"] = profile_update.email
    if profile_update.theme is not None:
        update_data["theme"] = profile_update.theme

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = supabase.from_("users").update(update_data).eq("email", user["email"]).execute()
    if resp.error:
        raise HTTPException(status_code=500, detail=resp.error.message)
    return {"message": "Profile updated successfully", "updated_fields": update_data}

# ==================== GENERIC CRUD (robust) ====================
def crud_routes(table: str):
    """Generate CRUD routes for a given table. Uses safe update filtering based on actual table columns."""

    @app.get(f"/{table}")
    def list_items():
        resp = supabase.from_(table).select("*").execute()
        if resp.error:
            raise HTTPException(status_code=500, detail=str(resp.error))
        return resp.data

    @app.get(f"/{table}/{{item_id}}")
    def get_item(item_id: str):
        resp = supabase.from_(table).select("*").eq("id", item_id).single().execute()
        if resp.error or not resp.data:
            raise HTTPException(status_code=404, detail="Item not found")
        return resp.data

    @app.post(f"/{table}")
    def create_item(data: Dict[str, Any]):
        # Basic protections: only send keys that are columns
        allowed = _get_columns(table)
        filtered = {k: v for k, v in data.items() if k in allowed}
        if not filtered:
            raise HTTPException(status_code=400, detail="No valid fields provided for create")
        resp = supabase.from_(table).insert(filtered).execute()
        if resp.error:
            raise HTTPException(status_code=500, detail=str(resp.error))
        return {"message": "Created successfully", "data": resp.data}

    @app.patch(f"/{table}/{{item_id}}")
    def update_item(item_id: str, req: GenericUpdateRequest):
        try:
            if not isinstance(req.data, dict) or not req.data:
                raise HTTPException(status_code=400, detail="No update data provided")

            allowed = _get_columns(table)
            update_payload = {k: v for k, v in req.data.items() if k in allowed}

            if not update_payload:
                raise HTTPException(status_code=400, detail=f"No valid updatable fields for table '{table}'. Allowed: {sorted(list(allowed))}")

            resp = supabase.from_(table).update(update_payload).eq("id", item_id).execute()
            if resp.error:
                # surface helpful debug details
                raise HTTPException(status_code=500, detail=str(resp.error))
            return {"message": "Updated successfully", "data": resp.data}
        except HTTPException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Unexpected server error: {e}")

    @app.delete(f"/{table}/{{item_id}}")
    def delete_item(item_id: str):
        resp = supabase.from_(table).delete().eq("id", item_id).execute()
        if resp.error:
            raise HTTPException(status_code=500, detail=str(resp.error))
        return {"message": "Deleted successfully"}

# Apply to all tables
for t in ["users", "referrals", "audit_logs", "tasks", "notifications", "settings", "wallets", "transactions", "approvals"]:
    crud_routes(t)

# ==================== DASHBOARDS ====================
@app.get("/admin/dashboard")
def get_admin_dashboard():
    total_users_resp = supabase.from_("users").select("id").execute()
    total_users = len(total_users_resp.data) if total_users_resp.data else 0
    return {
        "dashboard": "Admin",
        "total_users": total_users,
        "active_sessions": 5,
        "referral_stats": {"invites_sent": 12, "invites_accepted": 8},
    }

@app.get("/client/dashboard")
def get_client_dashboard(user=Depends(get_current_user)):
    referral_count_resp = supabase.from_("referrals").select("*").eq("referrer_id", user["id"]).execute()
    referral_count = len(referral_count_resp.data) if referral_count_resp.data else 0
    return {
        "dashboard": "Client",
        "welcome": f"Hello {user['email']}, welcome back!",
        "your_invite_code": user.get("invite", "N/A"),
        "referrals": referral_count,
    }

# ==================== DISCORD AUTH ====================
@app.get("/auth/discord/callback")
def discord_callback(code: str, redirect_uri: Optional[str] = None):
    client_id = DISCORD_CLIENT_ID
    client_secret = DISCORD_CLIENT_SECRET
    final_redirect_uri = redirect_uri or "http://localhost:3000/api/auth/discord/callback"

    token_url = "https://discord.com/api/oauth2/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": final_redirect_uri,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    token_res = requests.post(token_url, data=payload, headers=headers)
    token_data = token_res.json()

    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail="Failed to get access token")

    access_token = token_data["access_token"]

    user_res = requests.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {access_token}"})
    user_data = user_res.json()

    if "email" not in user_data:
        raise HTTPException(status_code=400, detail="Failed to get user info")

    email = user_data["email"].strip().lower()

    existing_resp = supabase.from_("users").select("*").eq("email", email).single().execute()
    if existing_resp.error or not existing_resp.data:
        supabase.from_("users").insert({
            "email": email,
            "verified": True,
            "name": user_data.get("username"),
            "role": "client",
            "notifications": True,
        }).execute()

    return {"access_token": email}
