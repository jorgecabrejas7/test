from fastapi import APIRouter
from CSTR_service.api.api_v1.endpoints import cstr

api_router = APIRouter()
api_router.include_router(cstr.router, prefix="/cstr", tags=["cstr"])