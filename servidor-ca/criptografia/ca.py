import datetime
import os

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography import x509
from cryptography.x509.oid import NameOID
from dotenv import load_dotenv #para ser possivel buscar password apartir do .env

load_dotenv()

password = os.environ.get("CA_PASSWORD", "devpassword").encode()

if "CA_PASSWORD" not in os.environ:
    print("WARNING: using default password (unsafe)")

BASE_DIR = "/app/certs" #pasta onde os certificados e chaves serão armazenados, mapeada para o host via docker-compose

CA_DIR = os.path.join(BASE_DIR, "ca")
USER_DIR = os.path.join(BASE_DIR, "users")

os.makedirs(CA_DIR, exist_ok=True)
os.makedirs(USER_DIR, exist_ok=True)


# criar CA
def create_ca():
    #private key do CA
    ca_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=4096
    )


    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "PT"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Lisboa"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Lisboa"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Voting System"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Grupo 4 CA"),
    ])

    #certificado do CA
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        ca_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3650) #válido por 10 anos
    ).add_extension(
        x509.BasicConstraints(ca=True, path_length=None),
        critical=True 
    ).sign(ca_key, hashes.SHA256())


    #guardar a chave privada e o certificado do CA em arquivos PEM
    with open(os.path.join(CA_DIR, "ca_key.pem"), "wb") as f:
        f.write(ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.BestAvailableEncryption(password)
        ))

    with open(os.path.join(CA_DIR, "ca_cert.pem"), "wb") as f:
        f.write(cert.public_bytes(
            serialization.Encoding.PEM
        ))
    return ca_key, cert

 

#emitir certificado para um utilizador
def issue_user_cert(ca_key, ca_cert, user_name):

    #chave privada do utilizador
    user_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096
    )

    #informação do certificado do utilizador
    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "PT"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Voting User"),
        x509.NameAttribute(NameOID.COMMON_NAME, user_name),
    ])

    #o emissor do certificado é o CA
    issuer = ca_cert.subject


    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        user_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
    ).add_extension( #indica que é utilizador, não CA
        x509.BasicConstraints(ca=False, path_length=None),
        critical=True
    ).sign(ca_key, hashes.SHA256())

    user_key_pem = user_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.BestAvailableEncryption(password)
    )

    user_cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    return user_key_pem, user_cert_pem

#teste:
#if __name__ == "__main__":
#    ca_key, ca_cert = create_ca()
#    issue_user_cert(ca_key, ca_cert, "user1")