from pydantic import BaseModel, validator
from enum import Enum
from typing import Optional

class Delta(str, Enum):
    off='off'
    bo='bo'
    kh='kh'


class CSTRData(BaseModel):
    V_liq: float
    V_gas: float
    q_ad: float
    COD: float
    CODs: float
    SV: float
    Ni: float
    Nt: float
    pH_in: float
    At: float
    Ap: float
    Bo: float
    Kh: float
    uncertainty: Delta
    progress_url: Optional[str]
    result_url: Optional[str]

    @validator('V_liq', 'V_gas', 'q_ad', 'COD', 'CODs', 'SV', 'Ni', 'Nt', 'pH_in', 'At', 'Ap', 'Bo', 'Kh')
    def prevent_zero(cls, v):
        if v == 0: 
            raise ValueError('Make sure this value is not 0')
        return v

    class Config:
        use_enum_values = True