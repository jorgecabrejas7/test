from pydantic import BaseModel
from typing import List

class Energy(BaseModel):
    name: str
    value: float

class Metric(BaseModel):
    status_code: int
    name: str
    value: float

class MetricList(BaseModel):
    status_code: int
    metrics: List[Metric]

class Covariance(BaseModel):
    covar_to: str
    value: float

class Parameter(BaseModel):
    status_codes: List[int]
    name: str
    value: float
    ci_inf: float = None
    ci_sup: float = None
    se: float
    covar_list: List[Covariance]

class ParameterList(BaseModel):
    status_code: int
    params: List[Parameter]

class BMPResultBase(BaseModel):
    status_code: int
    name: str
    values: List[float]
    predicted_values: List[float]
    params: ParameterList
    metrics: MetricList
    energy: List[Energy]

class BMPResultList(BaseModel):
    status_code: int
    time: List[float]
    substrates: List[BMPResultBase]