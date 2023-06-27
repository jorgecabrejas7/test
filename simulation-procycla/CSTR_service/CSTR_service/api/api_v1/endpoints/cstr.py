from fastapi import APIRouter, Depends, HTTPException
from CSTR_service.core.schemas.cstr_data import CSTRData
from CSTR_service.core.schemas.cstr_result import CSTRResult
from CSTR_service.core.schemas.uncertainty import UncertaintyData, UncertaintyResult
from CSTR_service.core.service.cstr_service import CSTRService

router = APIRouter()

@router.post("/run")
async def run_cstr(data: CSTRData, cstr_service: CSTRService = Depends(CSTRService)) -> CSTRResult:
    try:
        data = data.dict()
        result = cstr_service.run_adm1(user_input=data)
        return result
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/uncertainty-propagation")
async def propagate_uncertainty(data: UncertaintyData, cstr_service: CSTRService = Depends(CSTRService)) -> UncertaintyResult:
    try:
        data = data.dict()
        result = cstr_service.propagate_uncertainty(user_input=data)
        return result
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))