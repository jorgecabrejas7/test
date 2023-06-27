from fastapi import APIRouter, Depends, HTTPException, UploadFile
from wrangling_service.core.schemas.Output import OutputModel
from wrangling_service.core.service.wrangling_service import WranglingService

router = APIRouter()

@router.post("/load_file")
async def load_procycla_file(body: UploadFile, wrangling_service: WranglingService = Depends(WranglingService)) -> OutputModel:
    try:
        bytes_content = body.file.read()
        return wrangling_service.load_procycla_file(bytes_content)
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))