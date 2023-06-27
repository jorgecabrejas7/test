from pydantic import BaseModel
from typing import List

class SubstrateBase(BaseModel):
    name: str
    values: List[float]

class SubstrateList(BaseModel):
    flow: float
    volatile_solid: float
    time: List[float]
    substrates: List[SubstrateBase]