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

// - Botão Criar Eleição
async function criar_eleicao() {
    const nomeEleicao = document.getElementById('nome-eleicao').value;
    if (nomeEleicao.trim() === "") {
        alert("Por favor, insira o nome da eleição.");
        return;
    }

    const candidatos = [];
    const inputs = document.querySelectorAll('#lista-candidatos input[type="text"]');
    if (inputs.length === 0) {
        alert("Por favor, adicione pelo menos um candidato.");
        return;
    }

    const data_inicio = document.getElementById('data-inicio').value;
    if (data_inicio === "") {
        alert("Por favor, insira a data de início.");
        return;
    }

    const data_fim = document.getElementById('data-fim').value;
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
    
    inputs.forEach(input => {
        if (input.value.trim() !== "") {
            candidatos.push(input.value.trim());
        }
    });

    console.log("Eleição Criada:", nomeEleicao);
    console.log("Candidatos:", candidatos);
    console.log("Data de Início:", data_inicio);
    console.log("Data de Fim:", data_fim);

    try {
        const resposta = await fetch("http://localhost:4000/criar-eleicao", {    
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                nome: nomeEleicao,
                candidatos,
                data_inicio,
                data_fim
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
    alert("Erro ao criar a eleição. Tente novamente mais tarde.");
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
        const resposta = await fetch('http://localhost:4000/eleicoes');
        
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
            
            const eleicaobutao = document.createElement('button');
            eleicaobutao.textContent = 'Ver resultados da eleição';
            eleicaobutao.onclick = function() {
                ver_uma_eleicao(eleicao._id);
            };
            cartao.appendChild(eleicaobutao);
            
            exibir.appendChild(cartao);
        });
        
    } catch (erro) {
        console.error('O erro é', erro);
        const container = document.getElementById('resultados-container');
        container.innerHTML = '<p style="color: red;">Erro! Tente de novo!</p>';
    }
}

// ver resultados de uma eleição
async function ver_uma_eleicao(id) {
    try {
        const resposta = await fetch(`http://localhost:4000/eleicoes/${id}/resultados`);
        
        if (!resposta.ok) {
            alert("Erro ao carregar resultados.");
            return;
        }
        
        const dados = await resposta.json();
        
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

        const response = await fetch("http://localhost:4000/login", {
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
        const response = await fetch("http://localhost:4000/login", {
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

    const response = await fetch("http://localhost:4000/verify-token", {
        method: "POST",
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

    const response = await fetch("http://localhost:4000/create-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);
        window.location.href = "index.html";
    } else {
        alert(data.error);
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

    const response = await fetch("http://localhost:4000/verificar_password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
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

    try {
        const resposta = await fetch(`http://localhost:4000/eleicoes/${idInput}`);
        const data = await resposta.json();
        if (!resposta.ok) {
            alert(data.error);
            return;
        }
        window.location.href = `votar.html?id=${idInput}`;
    } catch (error) {
        alert("Erro ao verificar o ID da votação. Tente novamente mais tarde.");
    }

    
}

async function carregar_eleicao() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        alert("ID da votação não fornecido.");
        window.location.href = "id_votacao.html";
        return;
    }

    const resposta = await fetch(`http://localhost:4000/eleicoes/${id}`);

    if (!resposta.ok) {
        alert("Erro ao carregar a eleição. Verifique o ID e tente novamente.");
        window.location.href = "id_votacao.html";
        return;
    }

    const eleicao = await resposta.json();


    document.getElementById("titulo-eleicao").textContent = eleicao.nome;

    const container = document.getElementById("candidatos"); // Container onde os candidatos serão exibidos

    container.innerHTML = ""; // Limpa o container antes de adicionar os candidatos

    eleicao.opcoes.forEach((opcao) => {
        const div = document.createElement("div");
        div.innerHTML = `
            <input type="radio" name="candidato" value="${opcao.nome}"> 
            <label>${opcao.nome}</label>
        `; //teve de ser opcao.nome porque o backend tem a opção como um objeto {nome: "Candidato A"}
        container.appendChild(div);
    }
    );}

