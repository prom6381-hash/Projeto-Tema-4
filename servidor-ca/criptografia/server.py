from criptografia.DH import geraracao_chaves,serializar_publica,deserializar_publica,calculo_chave_sessao
from criptografia.AES_voto import encriptar,desencriptar
from criptografia.RSA_voto import gerar_chaves_rsa,serializar_privada,serializar_publica,privada_serializada,publica_serializada,assinatura,verifica_assinatura


@app.route('/dh/gerar-chaves', methods=['POST'])
def dh_gerar_chaves():
    priv,pub= geraracao_chaves()
    pub_serializada=serializar_publica(pub).encode('utf-8')
    return jsonify({'chave publica':pub_serializada })

@app.route('/dh/chave-sessao', methods=['POST'])
def dh_chave_sessao():
    data=request.json
    chave_pub_remota=deserializar_publica(data['chave_publica_remota']).encode('utf-8')
    priv,_=geraracao_chaves()
    chave_session=calculo_chave_sessao(priv,chave_pub_remota)
    return jsonify({'chave_sessao':base64.b64encode(chave_session).decode('utf-8')})

@app.route('/rsa/integridade', methods=['POST'])
def verificar_rsa():
    data=request.json
    chave_pub2=publica_serializada(data['chave_publica'].encode('utf-8'))
    validar=verifica_assinatura(
        chave_pub2,
        data['dados'].encode('utf-8'),
        base64.b64encode(data['assinatura'])
    )
    return jsonify({'valida:'valida})

@app.route('/aes/encriptar', methods=['POST'])
def aes_encriptar():
    data=request.json
    chave=base64.b64decode(data['chave'])
    voto=data['voto'].encode('utf-8')
    data_associa=data['data_associada'].encode('utf-8')
    iv, voto_cifrado, tag= encriptar(chave, voto, data_associa)
    return jsonify({
        'iv':base64.b64encode(iv).decode('utf-8')
        'voto_cifrado':base64.b64encode(voto_cifrado).decode('utf-8')
        'tag':base64.b64encode(tag).decode('utf-8')
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
    return jsonify({'voto:'voto.decode('utf-8')})

#if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=5000)

