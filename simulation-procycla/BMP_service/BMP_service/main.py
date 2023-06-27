from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from BMP_service.api.api_v1.api import api_router
from BMP_service.core.settings import settings

app = FastAPI(title="BMP API", openapi_url="/openapi.json")
app.include_router(api_router, prefix=settings.API_V1_STR)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )