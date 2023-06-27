FROM python:3.9
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./CSTR_service /code/CSTR_service

CMD ["uvicorn", "CSTR_service.main:app", "--host", "0.0.0.0", "--port", "80"]