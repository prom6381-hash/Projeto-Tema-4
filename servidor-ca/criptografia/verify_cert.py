import os
import datetime

from flask import Flask, request, jsonify
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes

app = Flask(__name__)

BASE_DIR = "/app/certs" #
CA_DIR = os.path.join(BASE_DIR, "ca")

with open(os.path.join(CA_DIR, "ca_cert.pem"), "rb") as f: #carrega o certificado do CA para verificar os certificados dos utilizadores
    ca_cert = x509.load_pem_x509_certificate(f.read())

ca_public_key = ca_cert.public_key()

@app.post("/verify_certificate")
def verify_certificate():

    try:
        data = request.get_json()
        cert_pem = data["certificate"].encode()

        cert = x509.load_pem_x509_certificate(cert_pem)

        #verificar se o certificado é válido (assinatura e validade)

        ca_public_key.verify(
            cert.signature,
            cert.tbs_certificate_bytes,
            padding.PKCS1v15(),
            cert.signature_hash_algorithm
        )

        now = datetime.datetime.now(datetime.timezone.utc)

        if now < cert.not_valid_before_utc:
            return jsonify({"valid": False, "error": "Certificado ainda não é válido"}), 

        if now > cert.not_valid_after_utc:
            return jsonify({"valid": False, "error": "Certificado expirado"})
        

        return jsonify({"valid": True, "subject": cert.subject.rfc4514_string()}) #retorna o assunto do certificado se for válido
    
    except Exception as e: #qualquer erro na verificação é tratado como certificado inválido
        return jsonify({"valid": False, "error": str(e)}) #str converte o erro para string para enviar na resposta
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6060)


    