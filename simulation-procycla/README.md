<!-- ABOUT THE PROJECT -->
## Procycla simulation services

This repository contains all the existing services for the Procycla Simulation Tool.

The services available in this repository are:
* Wrangling service
* BMP service
* CSTR service

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

requirements.txt

### Local Installation

To test the service in a local machine without docker

1. Clone the repo
   ```sh
   git clone https://github.com/in2ai/simulation-procycla.git
   ```
2. Install requirements with pip install -r requirements.txt
3. cd to the desired service
4. ```sh
   uvicorn service_name.main:app --host 0.0.0.0 --port 80
   ```

### Docker image

To test the service using docker. (needed to have docker installed)

1. Clone the repo
   ```sh
   git clone https://github.com/in2ai/simulation-procycla.git
   ```
2. cd to the desired service
3. docker build -t "image-name" .
4. docker run -p 80:80 "image-name"

### Local use

1. Open a web browser and go to localhost port 80 (127.0.0.1:80/docs)


<p align="right">(<a href="#readme-top">back to top</a>)</p>