FROM python:3.12-alpine

WORKDIR /app

COPY requisitos.txt ./
RUN pip install --no-cache-dir -r requisitos.txt

COPY . .

EXPOSE 5000

CMD ["python", "criptografia/ca.py"]