from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

# Serve static HTML
app.mount("/frontend", StaticFiles(directory="bot/frontend", html=True), name="frontend")

# Request model
class SignupRequest(BaseModel):
    username: str
    referral_id: str | None = None

# POST /signup
@app.post("/signup")
async def signup(data: SignupRequest):
    try:
        # Lookup user by username
        user = supabase.table("users").select("id").eq("username", data.username).execute()

        if user.data and len(user.data) > 0:
            # Update referral_id
            supabase.table("users").update({"referral_id": data.referral_id}).eq("username", data.username).execute()
            return JSONResponse(content={"message": "Signup successful!"})
        else:
            return JSONResponse(content={"message": "User not found."}, status_code=404)

    except Exception as e:
        print("Signup error:", e)
        return JSONResponse(content={"message": f"Internal Server Error: {str(e)}"}, status_code=500)
