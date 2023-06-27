FROM python:3.9
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./wrangling_service /code/wrangling_service

CMD ["uvicorn", "wrangling_service.main:app", "--host", "0.0.0.0", "--port", "80"]