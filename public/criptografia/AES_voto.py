import os
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms, modes

def encriptar(chave,voto,data_associada):
    iv= os.urandom(12)

    cifra= Cipher(algorithms.AES(chave),modes.GCM(iv)).encryptor()

    cifra.authenticate_additional_data(data_associada)

    voto_cifrado= cifra.update(voto)+ cifra.finalize()

    return (iv, voto_cifrado, cifra.tag)

def desencriptar(chave, data_associada,iv,voto_cifrado,tag):
    decifra= Cipher(algorithms.AES(chave),modes.GCM(iv,tag)).decryptor()

    decifra.authenticate_additional_data(data_associada)

    return decifra.update(voto_cifrado) + decifra.finalize()

iv, voto_cifrado, tag = encriptar(
    chave,
    b"a secret message!",
    b"authenticated but not encrypted payload"
)

print(desencriptar(
    chave,
    b"authenticated but not encrypted payload",
    iv,
    voto_cifrado,
    tag
))