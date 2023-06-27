from fastapi import APIRouter, Depends, HTTPException, UploadFile
from wrangling_service.core.service.wrangling_service import WranglingService
from wrangling_service.core.schemas.BPCModel import Samples
from wrangling_service.core.schemas.Output import OutputModel

router = APIRouter()

@router.post("/load_file")
async def load_BPC_file(body: UploadFile, wrangling_service: WranglingService = Depends(WranglingService)) -> Samples:
    try:
        return wrangling_service.load_BPC_file(body.file.read())
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/process_data")
async def process_BPC_file(data: Samples, wrangling_service: WranglingService = Depends(WranglingService)) -> OutputModel:
    try:
        return wrangling_service.process_BPC_file(data)
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))