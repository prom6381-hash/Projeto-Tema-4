import datetime
import os
import base64

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography import x509
from cryptography.x509.oid import NameOID
from dotenv import load_dotenv #para ser possivel buscar password apartir do .env
from flask import Flask, request, jsonify
from criptografia.auth import generate_salt, hash_password, verify_password
from criptografia.ECDH import geraracao_chaves, serializar_publica, deserializar_publica, calculo_chave_sessao
from criptografia.RSA_voto import publica_serializada, verifica_assinatura
from criptografia.AES_voto import encriptar, desencriptar

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

ca_key_path = os.path.join(CA_DIR, "ca_key.pem")
ca_cert_path = os.path.join(CA_DIR, "ca_cert.pem")

if os.path.exists(ca_key_path) and os.path.exists(ca_cert_path):
    with open(ca_key_path, "rb") as f:
        ca_key = serialization.load_pem_private_key(f.read(), password=password)

    with open(ca_cert_path, "rb") as f:
        ca_cert = x509.load_pem_x509_certificate(f.read())
        print("CA carregada com sucesso")
else:
    print("CA não encontrada, criando nova CA...")
    ca_key, ca_cert = create_ca()
    print("Nova CA criada com sucesso")

app = Flask(__name__)

@app.post("/sign")
def sign():
    data = request.json
    email = data["email"]

    key, cert = issue_user_cert(ca_key, ca_cert, email)

    return jsonify({
        "certificate": cert.decode(),
        "privateKey": key.decode()
    })


@app.route('/dh/gerar-chaves', methods=['POST'])
def dh_gerar_chaves():
    priv,pub= geraracao_chaves()
    pub_serializada=serializar_publica(pub)
    return jsonify({'chave_publica':pub_serializada.decode('utf-8') })

@app.route('/dh/chave-sessao', methods=['POST'])
def dh_chave_sessao():
    data=request.json
    chave_pub_bytes=data['chave_publica_remota'].encode('utf-8')
    chave_pub_remota=deserializar_publica(chave_pub_bytes)
    priv,_=geraracao_chaves()
    chave_session=calculo_chave_sessao(priv,chave_pub_remota)
    return jsonify({'chave_sessao':base64.b64encode(chave_session).decode('utf-8')})

@app.route('/rsa/integridade', methods=['POST'])
def verificar_rsa():
    data=request.json
    chave_pub_bytes2=data['chave_publica'].encode('utf-8')
    chave_pub2=publica_serializada(chave_pub_bytes2)
    dados_bytes=data['dados'].encode('utf-8')
    assinatura_bytes=base64.b64decode(data['assinatura'])
    validar=verifica_assinatura(
        chave_pub2,
        dados_bytes,
        assinatura_bytes
    )
    return jsonify({'valida': validar})

@app.route('/aes/encriptar', methods=['POST'])
def aes_encriptar():
    data=request.json
    chave=base64.b64decode(data['chave'])
    voto=data['voto'].encode('utf-8')
    data_associa=data['data_associada'].encode('utf-8')
    iv, voto_cifrado, tag= encriptar(chave, voto, data_associa)
    return jsonify({
        'iv':base64.b64encode(iv).decode('utf-8'),
        'voto_cifrado': base64.b64encode(voto_cifrado).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8')
    })

@app.route('/aes/desencriptar', methods=['POST'])
def aes_desencriptar():
    data=request.json
    chave=base64.b64decode(data['chave'])
    iv=base64.b64decode(data['iv'])
    voto_cifrado=base64.b64decode(data['voto_cifrado'])
    tag=base64.b64decode(data['tag'])
    data_associa=data['data_associada'].encode('utf-8')
    voto=desencriptar(chave,data_associa,iv,voto_cifrado,tag)
    return jsonify({'voto': voto.decode('utf-8')})













@app.post("/hash-password") #usa funçoes do auth.py para gerar um salt e hashear a password, retornando ambos para o cliente (que os irá guardar para futuras autenticações)
def hash_pw():

    data = request.json

    password = data["password"]

    salt = generate_salt()

    hashed = hash_password(password, salt)

    return jsonify({
        "salt": base64.b64encode(salt).decode(),
        "hash": hashed
    })



@app.post("/verify-password") #usa funçoes do auth.py para verificar se a password fornecida corresponde ao hash armazenado, usando o salt armazenado
def verify_pw():
    data = request.json

    password = data["password"]
    salt = base64.b64decode(data["salt"])
    stored_hash = data["hash"]

    is_valid = verify_password(stored_hash, password, salt)

    return jsonify({
        "valid": is_valid
    })





if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)




# o erro de gerar a chave RSA era que estávamos a chamer o ca-py e não o server.py, portanto  pus o código do server para aqui para ser mais fácil, em vez de estar a complicar

#teste:
#if __name__ == "__main__":
#    ca_key, ca_cert = create_ca()
#    issue_user_cert(ca_key, ca_cert, "user1")