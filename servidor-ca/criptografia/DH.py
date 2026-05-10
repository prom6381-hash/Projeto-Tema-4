from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import dh
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

parametros=dh.generate_parameters(generator=2,key_size=2048)

def geraracao_chaves():
    chave_privada=parametros.generate_private_key()
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
    segredo_shared=privada_local.exchange(publica_remota)

    chave_sessao= HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'sistema-de-votacao-eletronica',
    ).derive(segredo_shared)

    return chave_sessao
