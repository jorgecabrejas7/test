from fastapi import APIRouter
from wrangling_service.api.api_v1.endpoints import BPC_file, procycla_file

api_router = APIRouter()
api_router.include_router(BPC_file.router, prefix="/wrangling/BPC", tags=["BPC"])
api_router.include_router(procycla_file.router, prefix="/wrangling/procycla", tags=["procycla"])