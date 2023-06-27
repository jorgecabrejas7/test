FROM python:3.9
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./BMP_service /code/BMP_service

CMD ["uvicorn", "BMP_service.main:app", "--host", "0.0.0.0", "--port", "80"]