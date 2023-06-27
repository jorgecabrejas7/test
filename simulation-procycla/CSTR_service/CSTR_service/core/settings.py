from pydantic import AnyHttpUrl, BaseSettings, validator
from typing import List, Union
from json import loads
from os import path
import configparser

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    CONFIG_DIR_PATH = path.dirname(path.realpath(__file__))
    CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, "config.init")
    config = configparser.ConfigParser(allow_no_value=True)
    config.read(CONFIG_FILE_PATH)

    url_list = loads(config['address']['url'])
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = url_list

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True


settings = Settings()