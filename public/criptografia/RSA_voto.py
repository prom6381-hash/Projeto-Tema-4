from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding


with open("ficheiro.pem","rb") as x:
    msg=x.read()

gerar_privatekey= rsa.generate_private_key(public_exponent=65537,key_size=2048)

publickey= gerar_privatekey().public_key()

pem_privatekey=gerar_privatekey.private_bytes(
    encoding=serialization.Encoding.PEM,format=serialization.PrivateFormat.PKCS8,encryption_algorithm=serialization.BestAvailableEncryption()
)

with open("chave_privada.pem","wb") as x:
    x.write(pem_privatekey)

pem_publickey=publickey.public_bytes(encoding=serialization.Encoding.PEM,format=serialization.PublicFormat.SubjectPublicKeyInfo)


with open("chave_pública.pem","wb") as x:
    x.write(pem_publickey)


voto="Candidato"
voto_cifrado=publickey.encrypt(voto,padding.OAEP(
    mgf=padding.MGF1(
        algorithm=hashes.SHA256()
    ),
    algorithm=hashes.SHA256(),
    label=None
))

print(voto_cifrado)

voto_decifrado=gerar_privatekey.decrypt(voto_cifrado,padding.OAEP(
    mgf=padding.MGF1(
        algorithm=hashes.SHA256()
    ),
    algorithm=hashes.SHA256(),
    label=None
))

print(voto_decifrado)
