from pydantic import BaseModel
from typing import List

class Substrate(BaseModel):
    name: str
    values: List[float]

class OutputModel(BaseModel):
    time: List[float]
    substrates: List[Substrate]