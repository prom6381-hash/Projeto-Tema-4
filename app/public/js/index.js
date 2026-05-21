//index.html 


// NOTIFICAÇÕES BONITAS (substitui alert)


function mostrarNotificacao(mensagem, tipo = "sucesso") {
    const div = document.createElement("div");
    div.textContent = mensagem;
    div.className = `toast-notificacao toast-${tipo}`;
    document.body.appendChild(div);
    
    // Remove após 3.5 segundos
    setTimeout(() => {
        div.style.opacity = "0";
        div.style.transition = "opacity 0.3s ease";
        setTimeout(() => div.remove(), 300);
    }, 3500);
}

// Substitui alert() por notificações bonitas
const alertOriginal = window.alert;
window.alert = function(mensagem) {
    // Para mensagens de erro, usa notificação vermelha
    if (mensagem && (mensagem.toLowerCase().includes("erro") || 
                     mensagem.toLowerCase().includes("inválid") ||
                     mensagem.toLowerCase().includes("falhou") ||
                     mensagem.toLowerCase().includes("não"))) {
        mostrarNotificacao(mensagem, "erro");
    } else {
        mostrarNotificacao(mensagem, "sucesso");
    }
};

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
// faco isto para não haver erro ao votar ao tentar ao fazer apenas login, aoaga e gera novas chaves no localstorage para previnir isto
async function verificarChavesRSA() {
    if (localStorage.getItem("chave_Privada_RSA") && !localStorage.getItem("chave_Publica_RSA")) {
        console.log("Chave pública a faltar");
        localStorage.removeItem("chave_Privada_RSA"); 
        await gerarChavesRSA(); 
        
        // Enviar a nova chave pública para o servidor
        await fetch("/guardar-chave-rsa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                chavePublicaRSA: localStorage.getItem("chave_Publica_RSA")
            })
        });
        console.log("As chaves rsa antigas foram apagadas e foram geradas umas novas.");
    }
}

// - Botão Criar Eleição
async function criar_eleicao() {
    const nomeEleicao = document.getElementById('nome-eleicao').value;
    if (nomeEleicao.trim() === "") {
        alert("Por favor, insira o nome da eleição.");
        return;
    }
    const descricao = document.getElementById('descricao-eleicao')?.value?.trim() || null;
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
    //aqui e no index, como mandávamos date local, mas o mongoDB, tornava a data para UTC
    // vamos converter para UTC antes de enviar para a db, para 1hora de atraso antes de começar
    const data_inicio = new Date(document.getElementById('data-inicio').value);
    const data_fim = new Date(document.getElementById('data-fim').value);

    if (data_inicio === "") {
        alert("Por favor, insira a data de início.");
        return;
    }

    if (data_fim === "") {
        alert("Por favor, insira a data de fim.");
        return;
    }

    if (data_fim <= data_inicio) {
        alert("A data de fim não pode ser anterior/igual à data de início.");
        return;
    }

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    if (data_inicio < hoje) {
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
        let todosValidos = true;


        const dominios = [];
        const regrasDominios = /^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;   //não permitir escrever dominios de forma errada    
        const inputsDominio = document.querySelectorAll('input[name="dominio"]');

        inputsDominio.forEach(input => {
            const dominio = input.value.trim().replace(/^@/, ''); //remove o @ se for incluído no texto
            if (dominio !== "") {
                if (!regrasDominios.test('@' + dominio)) { //aqui adiciona para validar
                    alert(`O domínio "${dominio}" não tem um formato válido (Ex correto: @instituicao.pt).`);
                    todosValidos = false;
                    input.style.border = "2px solid red"; //mostrar aonde está o erro
                } else {
                    input.style.border = ""; //limpar erros
                    dominios.push(dominio); // para poder guardar aqui sem @
                }
            }
        });


        const emails = [];
        const regrasEmails = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const inputsEmail = document.querySelectorAll('input[name="email_eleicao"]');

        inputsEmail.forEach(input => {
                const email = input.value.trim();
                if (email !== "") {
                    if (!regrasEmails.test(email)) {
                        alert(`O e-mail "${email}" não tem um formato válido.`);    
                        todosValidos = false;
                        input.style.border = "2px solid red";
                    } else {
                        input.style.border = "";
                        emails.push(email);
                    }
                }
            });

        if (!todosValidos) {return};

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
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nomeEleicao,
                descricao,
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
                setTimeout(() => {   // isto dá tempo para ver a notificação do id da eleição
                    window.location.href = "votar_ou_criar.html";
                }, 5000);
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

// ver todas as eleições que criou
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
            cartao.className = 'eleicao-card';
            cartao.dataset.id = eleicao._id;
            
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
            if (estado.includes("ativa")) {
             estado1.className = "estado-ativa";
            } else if (estado.includes("acabou") || estado.includes("encerrada")) {
            estado1.className = "estado-encerrada";
            } else {
                estado1.className = "estado-pendente";
                }
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

// ver resultados de uma eleição escolhida
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

   
        const descricao = document.createElement('p');
        descricao.textContent = dados.descricao;
        container.appendChild(descricao);

        const totalVotos = document.createElement('p');
        totalVotos.textContent = `Total de votos: ${dados.totalVotos}`;
        container.appendChild(totalVotos);
        
        dados.resultados.forEach(candidato => {
            const linha = document.createElement('p');
            linha.textContent = `${candidato.nome}: Tem ${candidato.votos} votos (${candidato.percentagem}%)`;
            container.appendChild(linha);
            
            const barraFundo = document.createElement('div');
            barraFundo.className = 'barra-progresso-fundo';
            
            const barraPreenchida = document.createElement('div');
            barraPreenchida.className = 'barra-progresso-preenchida';
            barraPreenchida.textContent='0%';
            
            // Animação de preenchimento
            setTimeout(() => {
                barraPreenchida.style.width = `${candidato.percentagem}%`;
                barraPreenchida.textContent = `${candidato.percentagem}%`;
            }, 100);

            barraFundo.appendChild(barraPreenchida);
            container.appendChild(barraFundo);
        });
        
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
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
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
            credentials: "include",
            headers: {
                "Content-Type": "application/json"},
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
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
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
            window.location.href = "eleicao_publica_privada.html";
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
        credentials: "include",
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

    atualizarforcasenha("maiuscula", temMaiuscula, "Pelo menos 1 letra maiúscula");
    atualizarforcasenha("minuscula", temMinuscula, "Pelo menos 1 letra minúscula");
    atualizarforcasenha("numero", temNumero, "Pelo menos 1 número");
    atualizarforcasenha("especial", temEspecial, "Pelo menos 1 carácter especial");
    atualizarforcasenha("tamanho", temTamanho, "Pelo menos 8 caracteres");
}

async function atualizarforcasenha(id, valido,textoOriginal) {
    const elemento = document.getElementById(id);
    // tive de alterar isto "elemento.textContent = elemento.textContent.slice(2);" 
    if (elemento) {     //pq estava a cortar os dois primeiros caracteres, cada vez que escrevia um caracter
        elemento.textContent = textoOriginal;//Escreve o texto completo novamente (não corta nada!), em vez de pegar o que estava no eleemento, o que dava um bug
        elemento.style.color = valido ? "green" : "red";
    }
}

// VERIFICAR PASSWORD
async function verificarSenha() {
    const password = document.getElementById("verificar_password").value;

    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (!password) {
        alert("Por favor, insira a senha.");
        return;
    } 

    const response = await fetch("/verificar_password", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        credentials:"include",
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        await verificarChavesRSA(); //tem de ser feito por causa das novas chaves rsa geradas
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


    const response = await fetch (`/eleicoes/codigo/${idInput}`, {
        method: "GET",
        credentials: "include",
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
    localStorage.setItem("chave_Publica_RSA", chavepubBase64); //faço isto para guardar a chave publica para não haver erro ao tentar votar

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
    console.log("sessionStorage id_eleicao:", sessionStorage.getItem("id_eleicao"));
    console.log("localStorage id_eleicao:", localStorage.getItem("id_eleicao"));
    const  candidatoSelect=document.querySelector('input[name="candidato"]:checked');

    if (!candidatoSelect){
        alert("Escolha um candidatos, por favor!!");    
        return;
    }

    const idOpcao = candidatoSelect.value;
    const idEleicao=localStorage.getItem("id_eleicao");

    const botaoEnviar = document.getElementById("btn-enviar");
    botaoEnviar.textContent = "A cifrar e enviar...";
    botaoEnviar.style.background = "#f39c12";
    botaoEnviar.disabled = true;    
    
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
            true,// mudei de false para true para a chave poder ser reexportada depois de importada, pq estava a dar erro ao tentar votar
            ["sign"]
        );

        const assinatura=await assinaturaRSA(chavesECDH.chavePublica,chaveprivadaRSA);
        const respostaInicio=await fetch("/api/iniciar-votacao", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chavepub_remota: chavesECDH.chavePublica,
                assinatura: assinatura,    //faço localstorage para ir buscar a chave pub
                chavePublicaRSA: localStorage.getItem("chave_Publica_RSA") //gerar a chave priv para gerar a pub que verifica se existe ou n, para ser guardada na bd  
            }) // faço isto por causa do erro ao votar quando apenas fazemos login e não o criar conta, pq ao criar guarda e usa sempre a mesma chave RSA em vez de criar uma nova no login
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
            credentials: "include",
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
        console.log("ID sessão enviado:", dadosInicio.id_sessao);
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
    }localStorage.removeItem("id_eleicao");
localStorage.removeItem("nome_eleicao");
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

    const resposta = await fetch(`/eleicoes/codigo/${idInput}`);

    if (!resposta.ok) {
        alert("Erro ao carregar a eleição. Verifique o ID e tente novamente.");
        return;
    }

    const eleicao = await resposta.json();

    localStorage.setItem("id_eleicao", eleicao._id); //se não puser isto aqui, ambas aparecerão null
    localStorage.setItem("nome_eleicao", eleicao.nome);


    document.getElementById("titulo-eleicao").textContent = eleicao.nome;
    const descricaoEl = document.getElementById("descricao-eleicao");
    if (descricaoEl) {
        if (eleicao.descricao) {
            descricaoEl.textContent = eleicao.descricao;
            descricaoEl.style.display = "block";}
        else {
            descricaoEl.style.display = "none";
            }
    }
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
            credentials: "include",
            headers: { "Content-Type": "application/json" },
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
    
    if (divs.length > 1) {
        lista.removeChild(divs[divs.length - 1]);
    } else {
        alert("Não há domínios para remover.");
    }

}




function adicionar_email() {
    const lista = document.getElementById('lista-email'); 

    const novaDiv = document.createElement('div');
    novaDiv.className = "campo-email-container";
    novaDiv.style.marginTop = "10px";
    novaDiv.innerHTML = `
        <input type="text" name="email_eleicao" placeholder="XXXXX@instituicao.pt">
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




document.addEventListener("DOMContentLoaded", mostraremailsessao); //DOMContentLoaded corre o código quando o HTML estiver completamente carregado, garantindo que os elementos estão disponíveis para manipulação.

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");

    if (passwordInput) {
    passwordInput.addEventListener("input", verificarforcasenha);
    }
});


function irParaPublica() {
    window.location.href = "votacoes_publicas.html";
}

function irParaPrivada() {
    window.location.href = "id_votacao.html";
}

async function carregarEleicoesPublicas(pesquisa = "") {
    const container = document.getElementById("lista-publicas");
    if (!container) return;

    container.innerHTML = "<p>A carregar...</p>";

    try {
        const url = pesquisa.trim()
            ? `/eleicoes-publicas?q=${encodeURIComponent(pesquisa)}`
            : "/eleicoes-publicas";

        const resposta = await fetch(url, { credentials: "include" });

        if (resposta.status === 401) {
            container.innerHTML = '<p>Tens de ter sessão iniciada para ver as eleições.</p>';
            return;
        }

        let  eleicoes = await resposta.json(); //tem de set let para usar filter
        container.innerHTML = "";

        if (eleicoes.length === 0) {
            container.innerHTML = "<p>Nenhuma eleição pública encontrada.</p>";
            return;
        }

        const filtroEstado =
            document.getElementById("filtro-estado").value;

        const ordenacao =
            document.getElementById("ordenacao-eleicao").value;

        const agora = new Date();


        eleicoes = eleicoes.filter(eleicao => {

            const inicio = new Date(eleicao.data_inicio);
            const fim = new Date(eleicao.data_fim);
            
            if (filtroEstado === "ativas") {
                return agora >= inicio && agora <= fim;
            } 

            if (filtroEstado === "futuras") {
                return agora < inicio;
            }

            if (filtroEstado === "terminadas") {
                return agora > fim;
            }

            return true;
        });

        if (ordenacao === "recentes") {
            eleicoes.sort((a,b) =>
                new Date(b.data_inicio) - new Date(a.data_inicio)
        );} else if (ordenacao === "terminar") {
                eleicoes.sort((a,b) =>
                new Date(a.data_fim) -
                new Date(b.data_fim)
            ); 
            } else if (ordenacao === "alfabetica") {
            eleicoes.sort((a,b) =>
                a.nome.localeCompare(b.nome)
            );
        }

        container.innerHTML = "";

        if (eleicoes.length === 0) {

            container.innerHTML =
                "<p>Nenhuma eleição encontrada.</p>";

            return;
        }

        eleicoes.forEach(eleicao => {
            const agora = new Date();

            const inicio =new Date(eleicao.data_inicio);

            const fim = new Date(eleicao.data_fim);
            let estadoTexto;
            let estadoClasse;
            if (agora >= inicio && agora <= fim) {
                estadoTexto = "A decorrer";
                estadoClasse = "estado-ativa";
            } else if (agora < inicio) {
                estadoTexto = "Ainda não começou";
                estadoClasse = "estado-pendente";
            } else {
                estadoTexto = "Já terminou";
                estadoClasse = "estado-encerrada";
            }

            const card = document.createElement("div");
            card.className = "eleicao-card";

            card.innerHTML = `
                <h3>${eleicao.nome}</h3>
                ${eleicao.descricao ? `<p class="descricao-eleicao">${eleicao.descricao}</p>` : ''}
                <p>Código: <strong>${eleicao.codigo}</strong></p>
                <p>${new Date(eleicao.data_inicio).toLocaleDateString('pt-PT')} → ${new Date(eleicao.data_fim).toLocaleDateString('pt-PT')}</p>
                <p class="${estadoClasse}" style="font-weight: bold;">${estadoTexto}</p>
                <button class="Botão" onclick="irParaVotar('${eleicao.codigo}', '${eleicao._id}', '${eleicao.nome}')">Votar</button>
            `;

            container.appendChild(card);
        });

    } catch (erro) {
        console.error(erro);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar eleições.</p>";
    }
}

function irParaVotar(codigo, id, nome) {
    sessionStorage.setItem("id_eleicao", id);  //colocamos sessionStorage em vez de localStorage para que fique armazenado temporariamente
    sessionStorage.setItem("nome_eleicao", nome);
    window.location.href = `votar.html?id=${codigo}`;
}

document.addEventListener("DOMContentLoaded", () => {
    // Carrega eleições públicas se estiver na página certa
    if (document.getElementById("lista-publicas")) {
        carregarEleicoesPublicas();

        const btnPesquisar = document.getElementById("btn-pesquisar");
        const inputPesquisa = document.getElementById("pesquisa-eleicao");

        btnPesquisar.addEventListener("click", () => {
            carregarEleicoesPublicas(inputPesquisa.value);
        });

        // Pesquisa ao pressionar Enter
        inputPesquisa.addEventListener("keydown", (e) => {
            if (e.key === "Enter") carregarEleicoesPublicas(inputPesquisa.value);
        });
    }
});

async function verificarEleicaoPrivada(idEleicao, senha = "") {
    const resposta = await fetch("/verificar-eleicao-privada", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idEleicao,
            senha,
        })
    });

    const data = await resposta.json();
    if (!resposta.ok) {
        alert(data.error);
        return false;
    }

    return true;
}

async function submeterEleicaoPrivada() {
    const idInput = document.getElementById("id-votacao").value.trim();
    const senhaInput = document.getElementById("senha-eleicao").value.trim();

    if (!idInput || !senhaInput) {
        alert("Por favor, preencha o ID e a Senha da votação.");
        return;
    }

    // Chama a função que já tinhas no teu ficheiro JS
    const autorizado = await verificarEleicaoPrivada(idInput, senhaInput);
    
    if (autorizado) {
        // Se o servidor aceitar a senha, redireciona para a página de voto passando o ID
        window.location.href = `votar.html?id=${idInput}`;
    }
}
// Isto redireciona para a página de login se alguém tentar aceder diretamente a uma página protegida sem sessão
// se isto estiver a causar problemas de como o nosso site funciona, tirem isto!!
const paginasProtegidas = [
    "criar_eleicao.html",
    "eleicao_publica_privada.html",
    "enviar_token_criar_eleicao.html",
    "enviar_token_votar.html",
    "id_votacao.html",
    "resultados.html",
    "votacoes_publicas.html",
    "votar.html",                //Não colocamos verificar_senha.html, já que antes de verificar a senha ainda não existe sessão, dando erro.
    "votar_ou_criar.html"
];

document.addEventListener("DOMContentLoaded", async () => {
    const paginaAtual = window.location.pathname.split("/").pop();
    if (paginasProtegidas.includes(paginaAtual)) {
        try {
            const resposta = await fetch("/api/sessao-info", {
                credentials: "include"
            });

            if (!resposta.ok) {
                mostrarNotificacao("Precisa de fazer login para aceder a esta página.", "erro");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2000);
            }
        } catch (erro) {
            window.location.href = "index.html";
        }
    }
});

