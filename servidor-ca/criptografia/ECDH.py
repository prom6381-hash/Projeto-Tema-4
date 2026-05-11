from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def geraracao_chaves():
    chave_privada=ec.generate_private_key(ec.SECP256R1())
    chave_publica=chave_privada.public_key()
    return chave_privada,chave_publica

def serializar_publica(chave_publica):
    return chave_publica.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

def deserializar_publica(chave_bytes):
    return serialization.load_pem_public_key(chave_bytes)

def calculo_chave_sessao(privada_local,publica_remota):
    segredo_shared=privada_local.exchange(ec.ECDH(),publica_remota)

    chave_sessao= HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'sistema-de-votacao-eletronica',
    ).derive(segredo_shared)

    return chave_sessao
