from pydantic import BaseModel
from typing import List

class UncertaintyData(BaseModel):
    BoSE: float
    KhSE: float
    BoKhCovariance: float
    NSamples: int
    Original_qGas: List[float]
    Original_pH: List[float]
    BoDelta_qGas: List[float]
    BoDelta_pH: List[float]
    KhDelta_qGas: List[float]
    KhDelta_pH: List[float]

class UncertaintyElement(BaseModel):
    name: str
    value: List[float]
    min: List[float]
    max: List[float]

class UncertaintyResult(BaseModel):
    __root__: List[UncertaintyElement]
