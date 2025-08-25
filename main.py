from fastapi import FastAPI
#from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router

app = FastAPI()

from dotenv import load_dotenv
load_dotenv()

# Include auth routes
app.include_router(auth_router)
