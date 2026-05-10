from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature


def gerar_chaves_rsa():
    privatekey= rsa.generate_private_key(public_exponent=65537,key_size=2048)
    publickey= privatekey().public_key()

    return privatekey, publickey

def serializar_privada(chave_privada):
    return chave_privada.private_bytes(                                                                     #este guarda em plaintext o outro não
    encoding=serialization.Encoding.PEM,format=serialization.PrivateFormat.PKCS8,encryption_algorithm=serialization.NoEncryption() #não utilizamos BestAvaibleEncryption para ser mais fácil fazer o trabalho, se tivermos tempo, mudamos para o outro
    )                                                                                                                               #isto é pq é preciso ir buscar a password fornecida pelo user para fazer isto, que é mais complicado

def privada_serializada(chave_pem):
    return serialization.load_pem_private_key(chave_pem)

def serializar_publica(chave_publica):
    return chave_publica.public_bytes(
    encoding=serialization.Encoding.PEM,format=serialization.PublicFormat.SubjectPublicKeyInfo)

def publica_serializada(chave_pem):
    return serialization.load_pem_public_key(chave_pem)

def assinatura(chave_privada,dados):
    return chave_privada.sign(dados,padding.PSS(   #nao utilizamos padding OAEP, pq essa é para encriptar e esta é para auntenticar, já que fazemos aqui a assinatura
        mgf=padding.MGF1(                        #ou seja encriptamos com AES e autenticamos com RSA, pq vários votos ao msm tempo com encriptação RSA é demasiado lento
        algorithm=hashes.SHA256()
        ),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)

def verifica_assinatura(chave_publica,dados,assinatura):
    try:
        chave_publica.verify(assinatura,dados,padding.PSS(   
        mgf=padding.MGF1(                        
        algorithm=hashes.SHA256()
        ),
        salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256())
        return True
    except InvalidSignature:
        return False