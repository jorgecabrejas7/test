from pydantic import BaseModel
from typing import List

class Sample(BaseModel):
    id: int
    name: str
    substrate: float
    values: List[float]
    type: str = None
    blank: int = None
    cluster: int

class Samples(BaseModel):
    time: List[float]
    samples: List[Sample]