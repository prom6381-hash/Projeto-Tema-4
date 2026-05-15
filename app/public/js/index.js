///index.html 

//criar_eleicao.html

// - Botão Adicionar Candidatos
function adicionar_candidatos() {
    const lista = document.getElementById('lista-candidatos'); 
    const novaDiv = document.createElement('div');
    novaDiv.style.marginTop = "10px";
    novaDiv.innerHTML = `
        <p>Nome do Candidato</p>
        <input type="text" name="candidato">
    `;
    lista.appendChild(novaDiv);
}

//Botão remover candidato
function remover_candidato() {
    const lista = document.getElementById('lista-candidatos');
    const divs = lista.querySelectorAll('div');
    if (divs.length > 0) {
        lista.removeChild(divs[divs.length - 1]);
    } else {
        alert("Não há candidatos para remover.");
    }
}

function alternarCamposPrivacidade() {
    const tipo = document.getElementById("tipo-privacidade").value;
    const config = document.getElementById("configuracao-privada");

    if (tipo === "privada") {
        config.style.display = "block";
    } else {
        config.style.display = "none";
    }
}
// - Botão Criar Eleição
async function criar_eleicao() {
    const nomeEleicao = document.getElementById('nome-eleicao').value;
    if (nomeEleicao.trim() === "") {
        alert("Por favor, insira o nome da eleição.");
        return;
    }

    const candidatos = [];
    const inputs = document.querySelectorAll('#lista-candidatos input[type="text"]');
    inputs.forEach(input => {
        if (input.value.trim() !== "") {
            candidatos.push(input.value.trim());
        }
    });

    if (candidatos.length === 0) {
        alert("Por favor, adicione pelo menos um candidato.");
        return;
    }

    const data_inicio = document.getElementById('data-inicio').value;
    const data_fim = document.getElementById('data-fim').value;

    if (data_inicio === "") {
        alert("Por favor, insira a data de início.");
        return;
    }

    if (data_fim === "") {
        alert("Por favor, insira a data de fim.");
        return;
    }

    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);

    if (fim <= inicio) {
        alert("A data de fim não pode ser anterior/igual à data de início.");
        return;
    }

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    if (inicio < hoje) {
        alert("A eleição não pode começar no passado.");
        return;
    }
    
    const tipoPrivacidade = document.getElementById("tipo-privacidade").value;
    let dadosPrivacidade = { tipo: tipoPrivacidade };
    if (tipoPrivacidade === "privada") {
        const senha = document.getElementById("senha-eleicao").value;
        if (senha.trim() === "") {
            alert("Eleições privadas exigem uma palavra-passe.");
            return;
        }
        
        const dominios = [];
        document.querySelectorAll('input[name="dominio"]').forEach(input => {
            if (input.value.trim() !== "") dominios.push(input.value.trim());
        });

        const emails = [];
        document.querySelectorAll('input[name="email_eleicao"]').forEach(input => {
            if (input.value.trim() !== "") emails.push(input.value.trim());
        });

        if (dominios.length === 0 && emails.length === 0) {
            alert("Para eleições privadas, defina pelo menos um domínio ou um e-mail autorizado.");
            return;
        }

        dadosPrivacidade.senha = senha;
        dadosPrivacidade.dominios = dominios;
        dadosPrivacidade.emails = emails;
    }



    console.log("Eleição Criada:", nomeEleicao);
    console.log("Candidatos:", candidatos);
    console.log("Data de Início:", data_inicio);
    console.log("Data de Fim:", data_fim);

    try {
        const resposta = await fetch("/criar-eleicao", {    
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                nome: nomeEleicao,
                candidatos,
                data_inicio,
                data_fim,
                privacidade: dadosPrivacidade
            })
        }) 
        const data = await resposta.json();
            if (resposta.ok) {
                alert(`Eleição criada! Código: ${data.codigo}`);
                console.log("CODIGO DA ELEIÇÃO:", data.codigo);
                window.location.href = "votar_ou_criar.html";
            }  else {
                alert(data.error);
            }
} catch (error) {
    alert("Erro ao   a eleição. Tente novamente mais tarde.");
}
}

async function pedirTokenLogin() {
    await pedirToken("login");
}

async function pedirTokenRegisto() {
    await pedirToken("register");
}

async function pedirTokenVoto() {
    await pedirToken("vote");
}

async function pedirTokenCriar() {
    await pedirToken("create");
}

// ver resultados lista
async function ver_resultados() {
    try {
        const resposta = await fetch('/eleicoes');
        
        if (!resposta.ok) {
            alert("Erro ao carregar eleições.");
            return;
        }
        
        const dados = await resposta.json();
        
        const exibir = document.getElementById('resultados-container');
        exibir.innerHTML = '';
        
        if (dados.length === 0) {
            exibir.innerHTML = '<p>Não há eleições disponíveis.</p>';
            return;
        }
        
        dados.forEach(eleicao => {
            
            const cartao = document.createElement('div');
            cartao.dataset.id = eleicao._id;
            cartao.style.border = '1px solid #ccc';
            cartao.style.padding = '15px';
            cartao.style.margin = '10px 0';
            cartao.style.borderRadius = '8px';
            
            const titulo = document.createElement('h3');
            titulo.textContent = eleicao.nome;
            cartao.appendChild(titulo);
            
            const dataComeco = new Date(eleicao.data_inicio).toLocaleDateString('pt-PT');
            const dataAcaba = new Date(eleicao.data_fim).toLocaleDateString('pt-PT');
            
            const data = document.createElement('p');
            data.textContent = `Eleição ocorre de ${dataComeco} até ${dataAcaba}`;
            cartao.appendChild(data);
            
            const atual = new Date();
            const comeco = new Date(eleicao.data_inicio);
            const acaba = new Date(eleicao.data_fim);
            let estado;
            
            if (atual >= comeco && atual <= acaba) {
                estado = 'Eleição atualmente ativa e a decorrer!';
            } else if (atual < comeco) {
                estado = 'A eleição ainda não começou!';
            } else {
                estado = 'A eleição já acabou!';
            }
            
            const estado1 = document.createElement('p');
            estado1.textContent = estado;
            estado1.style.fontWeight = 'bold';
            cartao.appendChild(estado1);

            const id_votacao = document.createElement('p');
            id_votacao.textContent = `ID: ${eleicao.codigo}`;
            id_votacao.style.fontWeight= 'bold';
            cartao.appendChild(id_votacao);
            
            const eleicaobutao = document.createElement('button');
            eleicaobutao.textContent = 'Ver resultados da eleição';
            eleicaobutao.onclick = function() {
                ver_uma_eleicao(eleicao._id);
            };
            cartao.appendChild(eleicaobutao);
            
            exibir.appendChild(cartao);

        }); 
        
        const blocoInicial = document.getElementById("bloco2");
        blocoInicial.style.display = "none";

        const blocoRecarregar = document.getElementById("bloco-recarregar");
        const botaoRecarregar = document.createElement("button");
        botaoRecarregar.textContent = "Recarregar resultados";
        botaoRecarregar.className = "Botão";
        blocoRecarregar.innerHTML = ""; //limpar o lbloco par não duplicar blocos sempre que se carregar 
        botaoRecarregar.onclick = () => {
            document.getElementById("resultados").innerHTML = "";
            ver_resultados();
        }
        blocoRecarregar.appendChild(botaoRecarregar);


    } catch (erro) {
        console.error('O erro é', erro);
        const container = document.getElementById('resultados-container');
        container.innerHTML = '<p style="color: red;">Erro! Tente de novo!</p>';
    }
}

// ver resultados de uma eleição
async function ver_uma_eleicao(id) {
    try {
        const resposta = await fetch(`/eleicoes/${id}/resultados`);

        
        if (!resposta.ok) { 
            if (resposta.status === 401) {
                alert("O utilizador tem de ter sessão iniciada")
                return
            }
            alert("Erro ao carregar resultados.");
            return;
        }
        
        const dados = await resposta.json();

        const cartoes = document.querySelectorAll("#resultados-container div");
        cartoes.forEach(cartao => {
            if (cartao.dataset.id !== id) {
                cartao.style.display = "none";
            }
    })
        const container = document.getElementById('resultados');
        container.innerHTML = '';
        
        const titulo = document.createElement('h2');
        titulo.textContent = dados.nome;
        container.appendChild(titulo);
        
        const totalVotos = document.createElement('p');
        totalVotos.textContent = `Total de votos: ${dados.totalVotos}`;
        container.appendChild(totalVotos);
        
        dados.resultados.forEach(candidato => {
            const linha = document.createElement('p');
            linha.textContent = `${candidato.nome}: Tem ${candidato.votos} votos (${candidato.percentagem}%)`;
            container.appendChild(linha);
            
            const barraFundo = document.createElement('div');
            barraFundo.style.background = '#e0e0e0';
            barraFundo.style.height = '24px';
            barraFundo.style.borderRadius = '4px';
            barraFundo.style.marginBottom = '15px';
            
            const barraPreenchida = document.createElement('div');
            barraPreenchida.style.background = '#3498db';
            barraPreenchida.style.height = '100%';
            barraPreenchida.style.width = `${candidato.percentagem}%`;
            barraPreenchida.style.borderRadius = '4px';
            
            barraFundo.appendChild(barraPreenchida);
            container.appendChild(barraFundo);
        });
        
        const botaoVoltar = document.createElement('button');
        botaoVoltar.textContent = 'Voltar';
        botaoVoltar.onclick = ver_resultados;
        container.appendChild(botaoVoltar);
        
    } catch (erro) {
        console.error('Erro:', erro);
        alert("Erro ao obter os resultados. Tente novamente!")
    }
}


// PEDIR TOKEN
async function pedirToken(tipo) {


    if (tipo == "login" || tipo == "register") {
        const email = document.getElementById("email").value;

        if (!email || email.trim() === "") {
            alert("Por favor, insere o email.");
            return;
        }

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                tokenType: tipo
            })
        });

        if (tipo === "register" && response.status === 404) {
            alert("Utilizador já existe. Por favor, insira um email diferente.");
            window.location.href = "index.html";
            return;
        }

        const data = await response.json();

        if (response.ok) {
            alert(data.message);

            window.location.href =
                "verificar_token.html?type=" + tipo +
                "&email=" + encodeURIComponent(email);

        } else {
            alert(data.error);
        }
    } else if (tipo === "vote" || tipo === "create") {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({
                tokenType: tipo
            })
        });
        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            window.location.href =
                "verificar_token.html?type=" + tipo;
        } else {
            alert(data.error);
        }      
    } else {   
        alert("Tipo de token desconhecido.");
    }
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        email: params.get("email"),
        tokenType: params.get("type")
    };
}

// VERIFICAR TOKEN
async function verificar_token() {
    const { tokenType } = getQueryParams();
    const token = document.getElementById("token").value;

    if (!tokenType) {
        alert("Tipo de operação inválida. Por favor, tente novamente.");
        window.location.href = "index.html";
        return;
    }

    if (!token || token.trim() === "") {
        alert("Por favor, insere o token.");
        return;
    }

    const response = await fetch("/verify-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            email: getQueryParams().email,
            token,
            tokenType
        })
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);

        if (tokenType === "register") {
            window.location.href = `criar_senha.html?email=${encodeURIComponent(getQueryParams().email)}`;
        } else if (tokenType === "login") {
            window.location.href = `verificar_senha.html?email=${encodeURIComponent(getQueryParams().email)}`;
        } else if (tokenType === "vote") {
            window.location.href = "id_votacao.html";
        } else if (tokenType === "create") {
            window.location.href = "criar_eleicao.html";
        }

    } else {
        alert(data.error)
        if (response.status === 429) {
            window.location.href = "index.html";
        }
    }
}

// CRIAR PASSWORD
async function criarSenha() {
    const password = document.getElementById("password").value;
    const confirmarPassword = document.getElementById("confirmar_password").value;


    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (!password || !confirmarPassword) {
        alert("Por favor, preencha ambos os campos de senha.");
        return;
    }

    if (password !== confirmarPassword) {
        alert("As senhas não coincidem. Tente novamente.");
        return;
    }   
    const passwordForte =
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password) &&
        password.length >= 8;

    if (!passwordForte) {
        alert("A password não cumpre os requisitos de segurança.");
        return;
    }
    const chavepublicaRSA= await gerarChavesRSA();
    console.log("chavepublicaRSA gerada:", chavepublicaRSA ? "SIM" : "NÃO");

    const response = await fetch("/create-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email:email, password:password, chavePublicaRSA: chavepublicaRSA })
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);
        window.location.href = "index.html";
    } else {
        alert(data.error);
    }
}

async function verificarforcasenha() {
    
    const password = document.getElementById("password").value;

    const temMaiuscula = /[A-Z]/.test(password);
    const temMinuscula = /[a-z]/.test(password);
    const temNumero = /[0-9]/.test(password);
    const temEspecial = /[^A-Za-z0-9]/.test(password);
    const temTamanho = password.length >= 8;

    atualizarforcasenha("maiuscula", temMaiuscula);
    atualizarforcasenha("minuscula", temMinuscula);
    atualizarforcasenha("numero", temNumero);
    atualizarforcasenha("especial", temEspecial);
    atualizarforcasenha("tamanho", temTamanho);
}

async function atualizarforcasenha(id, valido) {
    const elemento = document.getElementById(id);

    if (valido) {
        elemento.textContent = "✅ " + elemento.textContent.slice(2);
        elemento.style.color = "green";
    } else {
        elemento.textContent = "❌ " + elemento.textContent.slice(2);
        elemento.style.color = "red";
    }
}

// VERIFICAR PASSWORD
async function verificarSenha() {
    const password = document.getElementById("verificar_password").value;

    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    localStorage.setItem("email", email);

    if (!password) {
        alert("Por favor, insira a senha.");
        return;
    } 

    const response = await fetch("/verificar_password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials:"include",
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        if(!localStorage.getItem("chave_Privada_RSA")){
            const chavePublicaRSA=await gerarChavesRSA();
            await fetch("/guardar-chave-rsa",{
                method:"POST",
                headers: {"Content-Type": "application/json"},
                credentials:"include",
                body:JSON.stringify({ //tirei o email, para o browser usar apenas o email de sessao
                    chavePublicaRSA: chavePublicaRSA
                })
            });
        }
        alert(data.message);
        window.location.href = "votar_ou_criar.html";
    } else {
        alert(data.error);
    }
}


async function id_votacao() {

    const idInput = document.getElementById("id-votacao").value.trim();
    if (!idInput) {
        alert("Por favor, insira o ID da votação.");
        return;
    }


    const response = await fetch (`/eleicoes/${idInput}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem("id_eleicao",data._id); //troco para data._id pq no votar() nós utilizamos o id da base de dados não dao id da eleição,
        localStorage.setItem("nome_eleicao",data.nome); // e nos resultados das eleições nós procuramos pelo _id

        window.location.href = `votar.html?id=${idInput}`;
    } else {
        alert(data.error || data.erro3 || "Não encontrámos a eleição");
    }
}



function base64ParaArraybuffer(base64){
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferParaBase64(buffer){
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
    

async function gerarChavesRSA(){
    const chaves= await crypto.subtle.generateKey({
        name:"RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1,0,1]),
        hash: "SHA-256",
        },
        true,
        ['sign','verify']
    );

    const chavepubExportada= await crypto.subtle.exportKey(
        "spki",
        chaves.publicKey
    );
    const chavepubBase64= arrayBufferParaBase64(chavepubExportada);

    const chaveprivadaExportada= await crypto.subtle.exportKey(
        "pkcs8",
        chaves.privateKey
    );
    const chaveprivadaBase64= arrayBufferParaBase64(chaveprivadaExportada);
    localStorage.setItem("chave_Privada_RSA", chaveprivadaBase64);

    return chavepubBase64;

}

async function assinaturaRSA(dados,chavePrivadaRSA){
    const dadosBytes= new TextEncoder().encode(dados);
    const assinatura= await crypto.subtle.sign(
        {name: "RSA-PSS",
            saltLength: 32,
        },
        chavePrivadaRSA,
        dadosBytes
    );
    return arrayBufferParaBase64(assinatura);
}

async function gerarchavesDH(){
    const chaves= await crypto.subtle.generateKey({
        name: "ECDH",
        namedCurve:"P-256"
        },
        true,
        ['deriveBits']
    );
    const chavepubExportada= await crypto.subtle.exportKey("spki", chaves.publicKey);
    const chavepubBase64=arrayBufferParaBase64(chavepubExportada);
    return {chavePrivada: chaves.privateKey, chavePublica: chavepubBase64};
}

async function calcularchaveSessao(chaveprivadaECDH,chavepubServerBase64){
    const chavepubServer= await crypto.subtle.importKey(
        "spki",
        base64ParaArraybuffer(chavepubServerBase64),
        {name: "ECDH",
            namedCurve:"P-256"
        },
        false,
        []
    
    );

    const segredoPartilhado= await crypto.subtle.deriveBits({
        name: "ECDH",
        public: chavepubServer
        },
        chaveprivadaECDH,
        256
    );

    const chaveHKDF= await crypto.subtle.importKey(
        "raw",
        segredoPartilhado,
        {name:"HKDF"},
        false,
        ["deriveKey"]
    );

    const ultimachave= await crypto.subtle.deriveKey(
        {name:"HKDF",
            hash: "SHA-256",
            salt: new Uint8Array(0),
            info: new TextEncoder().encode("sistema-de-votacao-eletronica")
        },
        chaveHKDF,
        {name:"AES-GCM",
            length:256
        },
        false,
        ["encrypt"]
    );

    return ultimachave;

}

async function encriptarVoto(chaveSessao,voto,AAD){
    const iv=crypto.getRandomValues(new Uint8Array(12));

    const votoCifrado= await crypto.subtle.encrypt(
        {name:"AES-GCM",
            iv:iv,
            additionalData: new TextEncoder().encode(AAD)
        },
        chaveSessao,
        new TextEncoder().encode(voto)
    );
    
    return {iv: arrayBufferParaBase64(iv),
        votoCifrado: arrayBufferParaBase64(votoCifrado.slice(0,-16)),
    tag: arrayBufferParaBase64(votoCifrado.slice(-16))
    };

}


async function votar(){
    const  candidatoSelect=document.querySelector('input[name="candidato"]:checked');

    if (!candidatoSelect){
        alert("Escolha um candidatos, por favor!!");
        return;
    }

    const idOpcao = candidatoSelect.value;
    const idEleicao=localStorage.getItem("id_eleicao");
    
    try{
        const chavesECDH= await gerarchavesDH();

        const chaveprivadaRSABase64=localStorage.getItem("chave_Privada_RSA");
        if (!chaveprivadaRSABase64){
            alert("A chave RSA não foi encontrado, recomeçe o registo!!");
            return;
        }

        const chaveprivadaRSA= await crypto.subtle.importKey(
            "pkcs8",
            base64ParaArraybuffer(chaveprivadaRSABase64),
            {name:"RSA-PSS",
                hash:"SHA-256"
            },
            false,
            ["sign"]
        );

        const assinatura=await assinaturaRSA(chavesECDH.chavePublica,chaveprivadaRSA);
        const respostaInicio=await fetch("/api/iniciar-votacao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                //email: email,    faço isto para testar 
                chavepub_remota: chavesECDH.chavePublica,
                assinatura: assinatura
            })
        });

        const dadosInicio= await respostaInicio.json();
        if (!respostaInicio.ok){
            alert(dadosInicio.error);
            return;
        }

        const chaveSessao= await crypto.subtle.importKey( //antes tinha o nome da funcao que gera chaves de sessao
            //chavesECDH.chavePrivada,      e agora alterei para ter o mesmo formato que o do browser
            //dadosInicio.chave_publica_dh   pq estava a dar erro de cryptography.exceptions.InvalidTag
            "raw",
            base64ParaArraybuffer(dadosInicio.chave_sessao),
            {name:"AES-GCM"},
            false,
            ["encrypt"]     
        );

        const votoEncriptado= await encriptarVoto(
            chaveSessao,
            idOpcao,
            idEleicao
        );
        console.log("Voto encriptado - iv:", votoEncriptado.iv.substring(0, 20) + "...");
        console.log("Voto encriptado - tag:", votoEncriptado.tag.substring(0, 20) + "...");
        console.log("Voto encriptado - votoCifrado:", votoEncriptado.votoCifrado.substring(0, 20) + "...");

        const respostaVoto= await fetch("/api/votar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_sessao: dadosInicio.id_sessao,
                votoCifrado: votoEncriptado.votoCifrado,
                iv: votoEncriptado.iv,
                tag: votoEncriptado.tag,
                AAD: idEleicao,
                idEleicao: idEleicao
            })
        });

        const dadosVoto=await respostaVoto.json();
        if(respostaVoto.ok){
            alert(dadosVoto.message);
            localStorage.removeItem("id_eleicao");
            localStorage.removeItem("nome_eleicao");
            window.location.href="votar_ou_criar.html";
        }
        else{
            alert(dadosVoto.error);
        }
    } catch(erro){
        console.error("Erro ao votar:", erro);
        alert("Houve um erro ao tentar processar o voto!!")
    }
}

async function carregar_eleicao() {
    if (window.location.pathname.includes("enviar_token_votar.html")) {
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const idInput = params.get("id");

    if (!idInput && window.location.pathname.includes("votar.html")) {
        alert("ID da votação não fornecido.");
        return;
    }

    const resposta = await fetch(`/eleicoes/${idInput}`);

    if (!resposta.ok) {
        alert("Erro ao carregar a eleição. Verifique o ID e tente novamente.");
        return;
    }

    const eleicao = await resposta.json();


    document.getElementById("titulo-eleicao").textContent = eleicao.nome;

    const container = document.getElementById("candidatos"); // Container onde os candidatos serão exibidos

    container.innerHTML = ""; // Limpa o container antes de adicionar os candidatos

    eleicao.opcoes.forEach((opcao, index) => {
        const div = document.createElement("div");
        div.style.marginTop = "30px";
        div.style.marginRight = "800px";
        div.style.fontSize = "22px";// tive de mudar,abaixo, opcao.nome para ._id pq o nosso backend guarda através do id não o nome
        div.innerHTML = `
            <input type="radio" name="candidato" id="opcao_${index}" value="${opcao._id}"> 
            <label for="opcao_${index}" style="margin-left: 10px;">${opcao.nome}</label>  
            `
        ; //teve de ser opcao.nome porque o backend tem a opção como um objeto {nome: "Candidato A"}
        const radio = div.querySelector('input');
        radio.addEventListener("change", function() {
            document.getElementById("voto-selecionado").textContent = this.value;
        });
        container.appendChild(div);
    }
    );}


async function mostraremailsessao() {
    try {
        const resposta = await fetch("/api/sessao-info", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
        });
        const data = await resposta.json();
        const mostraremail = document.getElementById("mostraremailsessao");
        if (resposta.ok && data.sessao_ativa    ) {
            mostraremail.textContent = `Olá, ${data.email}`;
        }   else {
            mostraremail.textContent = "Registar/Iniciar Sessão";
            mostraremail.style.cursor = "pointer";
            mostraremail.onclick = () => (
                window.location.href = "index.html"
            )
        }
    } catch (erro) {
        console.error("Erro ao mostrar email da sessão:", erro);
        const mostraremail = document.getElementById("mostraremailsessao");
        mostraremail.textContent = "Erro ao carregar email da sessão";
    }
}


function adicionar_dominio() {
    const lista = document.getElementById('lista-dominios'); 

    const novaDiv = document.createElement('div');
    novaDiv.style.marginTop = "10px";
    novaDiv.innerHTML = `
        <input type="text" name="dominio" placeholder="@instituicao.pt">
    `;
    lista.appendChild(novaDiv);
}

function remover_dominio() {
    const lista = document.getElementById('lista-dominios');
    if (!lista) return;

    const divs = lista.querySelectorAll('div');
    
    if (divs.length > 0) {
        lista.removeChild(divs[divs.length - 1]);
    } else {
        alert("Não há domínios para remover.");
    }
}

function verificar_existe_dominio() {
    const inputsDominio = document.querySelectorAll('input[name="dominio"]');
    
    if (inputsDominio.length === 0 || inputsDominio[0].value.trim() === "") {
        alert("Adicione pelo menos um domínio para prosseguir!");
        return;
    }

    const dominios = [];

    inputsDominio.forEach(input => {

        const dominio = input.value.trim();

        if (dominio !== "") {
            dominios.push(dominio);
        }
    });

    sessionStorage.setItem("tipo_privacidade", "dominios");
    sessionStorage.setItem("dominios_permitidos", JSON.stringify(dominios));
    window.location.href = "criar_eleicao.html";


}

function adicionar_email() {
    const lista = document.getElementById('lista-email'); 

    const novaDiv = document.createElement('div');
    novaDiv.className = "campo-email-container";
    novaDiv.style.marginTop = "10px";
    novaDiv.innerHTML = `
        <input type="text" name="dominio" placeholder="XXXXX@instituicao.pt">
    `;
    lista.appendChild(novaDiv);
}

function remover_email() {
    const lista = document.getElementById('lista-email');
    if (!lista) return;

    const elementos = lista.children;
    
    if (elementos.length > 1) {
        lista.removeChild(elementos[elementos.length - 1]);
    } else {
        alert("Não há emails para remover.");
    }
}

function verificar_existe_email() {
    const inputsEmail = document.querySelectorAll('input[name="email"]');
    
    if (inputsEmail.length === 0 || inputsEmail[0].value.trim() === "") {
        alert("Adicione pelo menos um email para prosseguir!");
        return;
    }

    window.location.href = "criar_eleicao.html"
}





async function importarFicheiro(input) {

    if (!input.files || !input.files[0]) return;
    const leitor = new FileReader();

    leitor.onload = function(evento) {

        const emails = evento.target.result.split(/\r?\n/).filter(line => line.trim());
        
        const container = document.getElementById('lista-email');
        emails.forEach(email => {
            // Injeta o input com a mesma estrutura para o remover_email() conseguir apagar depois
            container.insertAdjacentHTML('beforeend', `
                <div class="campo-email-container" style="margin-top: 10px;">
                    <input type="text" name="email_eleicao" value="${email.trim()}">
                </div>
            `);
        });
    };


    leitor.readAsText(input.files[0]);
}
if (window.location.pathname.includes("votar.html")) {
    document.addEventListener("DOMContentLoaded", carregar_eleicao);
}


async function criar_eleicao_privada() {
    const nomeEleicao = document.getElementById('nome-eleicao').value.trim();
    const senha = document.getElementById('senha_eleicao').value.trim();


    if (nomeEleicao === "") {
        alert("Insira o nome da eleição.");
        return;
    }

    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    const candidatos = [];

    const inputs = document.querySelectorAll('#lista-candidatos input[type="text"]');

    inputs.forEach(input => {

        if (input.value.trim() !== "") {
            candidatos.push(input.value.trim());
        }
    });

    if (candidatos.length === 0) {
        alert("Adicione candidatos.");
        return;
    }

    const data_inicio = document.getElementById('data-inicio').value;
    const data_fim = document.getElementById('data-fim').value;

    const tipo_privacidade = sessionStorage.getItem("tipo_privacidade");

    const emails = JSON.parse(sessionStorage.getItem("emails_permitidos")) || [];

    const dominios = JSON.parse(sessionStorage.getItem("dominios_permitidos")) || [];

    try {

        const resposta = await fetch("/criar-eleicao-privada", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({

                nome: nomeEleicao,
                senha,
                candidatos,
                data_inicio,
                data_fim,

                tipo_privacidade,

                emails_permitidos: emails,

                dominios_permitidos: dominios
            })
        });

        const data = await resposta.json();

        if (resposta.ok) {

            sessionStorage.removeItem("emails_permitidos");
            sessionStorage.removeItem("dominios_permitidos");
            sessionStorage.removeItem("tipo_privacidade");

            alert(`Eleição criada! Código: ${data.codigo}`);

            window.location.href = "votar_ou_criar.html";

        } else {

            alert(data.error);
        }

    } catch (erro) {

        alert("Erro ao criar eleição.");
    }
}


document.addEventListener("DOMContentLoaded", mostraremailsessao); //DOMContentLoaded corre o código quando o HTML estiver completamente carregado, garantindo que os elementos estão disponíveis para manipulação.

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");

    if (passwordInput) {
    passwordInput.addEventListener("input", verificarforcasenha);
    }
});






//isto é para teste apenas 
//async function enviarChaveRSA() {
  //  const chavePublicaRSA = localStorage.getItem("chave_Privada_RSA");
    
    //if (!chavePublicaRSA) {
      //  const novaChave = await gerarChavesRSA();
        //alert("Chave RSA gerada. Tenta votar novamente.");
//        return;
  //  }
    
    //const email = localStorage.getItem("email");
    
//    const response = await fetch("http://localhost:4000/guardar-chave-rsa", {
//        method: "POST",
   //      headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({ 
   //          email: email, 
    //         chavePublicaRSA: chavePublicaRSA 
   //      })
   //  });
    
   //  const data = await response.json();
  //   console.log(data);
  // alert(data.message || data.error)
