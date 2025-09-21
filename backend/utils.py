import os
import jwt
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, Dict, Any

# Load environment variables
load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGO: str = "HS256"

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ SUPABASE_URL and SUPABASE_KEY must be set in .env")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def create_access_token(data: Dict[str, Any], expires_delta: int = 60) -> str:
    """
    Create a JWT access token.

    Args:
        data (dict): Payload data to encode.
        expires_delta (int): Expiration time in minutes (default: 60).
    
    Returns:
        str: Encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGO)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a JWT token.

    Args:
        token (str): JWT token.
    
    Returns:
        dict | None: Decoded payload if valid, else None.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload
    except jwt.ExpiredSignatureError:
        print("⚠️ Token expired")
        return None
    except jwt.InvalidTokenError:
        print("⚠️ Invalid token")
        return None
