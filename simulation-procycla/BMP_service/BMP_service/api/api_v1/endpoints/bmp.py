from fastapi import APIRouter, Depends, HTTPException
from BMP_service.core.schemas.substrate import SubstrateList
from BMP_service.core.schemas.bmp_result import BMPResultList
from BMP_service.core.services.bmp_service import BMPService

router = APIRouter()

@router.post("/run")
async def run_bmp(data: SubstrateList, bmp_service: BMPService = Depends(BMPService)) -> BMPResultList:
    try:
        result = bmp_service.run_bmp(data=data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))