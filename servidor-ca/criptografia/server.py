from criptografia.DH import geraracao_chaves,serializar_publica,deserializar_publica,calculo_chave_sessao
from criptografia.AES_voto import encriptar,desencriptar
from criptografia.RSA_voto import gerar_chaves_rsa,serializar_privada,serializar_publica,privada_serializada,publica_serializada,assinatura,verifica_assinatura
from criptografia.auth import generate_salt, hash_password, verify_password
from flask import Flask, request, jsonify
import base64

app= Flask(__name__)



@app.route('/hash-password', methods=['POST'])
def hash_pw():
    data = request.json
    password = data["password"]
    salt = generate_salt()
    hashed = hash_password(password, salt)
    return jsonify({
        "salt": base64.b64encode(salt).decode(),
        "hash": hashed
    })


@app.route('/verify-password', methods=['POST'])
def verify_pw():
    data = request.json
    password = data["password"]
    salt = base64.b64decode(data["salt"])
    stored_hash = data["hash"]
    is_valid = verify_password(stored_hash, password, salt)
    return jsonify({"valid": is_valid})

@app.route('/dh/gerar-chaves', methods=['POST'])
def dh_gerar_chaves():
    priv,pub= geraracao_chaves()
    pub_serializada=serializar_publica(pub)
    return jsonify({'chave publica':pub_serializada.decode('utf-8') })

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

