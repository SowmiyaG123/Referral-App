from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from utils import supabase, verify_token
from typing import Optional, Dict, Any

# OAuth2 scheme: points to login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticate user with Supabase credentials.
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        # Supabase client returns a dict with "user" and "session"
        user = response.get("user") if isinstance(response, dict) else getattr(response, "user", None)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        return user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Decode JWT and return user payload.
    """
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload
