from fastapi import APIRouter
from BMP_service.api.api_v1.endpoints import bmp

api_router = APIRouter()
api_router.include_router(bmp.router, prefix="/bmp", tags=["bmp"])