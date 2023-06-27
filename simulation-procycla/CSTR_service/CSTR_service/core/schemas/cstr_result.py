from pydantic import BaseModel
from typing import List

class ResultDict(BaseModel):
    name: str
    value: dict

class CSTRResult(BaseModel):
    status_code: int
    trh: float
    execution_days: int
    results: List[ResultDict]