//index.html 





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
function criar_eleicao() {
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

    const dataInicio = document.getElementById('data-inicio').value;
    if (dataInicio === "") {
        alert("Por favor, insira a data de início.");
        return;
    }

    const dataFim = document.getElementById('data-fim').value;
    if (dataFim === "") {
        alert("Por favor, insira a data de fim.");
        return;
    }
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

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
        if (input.value.trim() !== "") { //trim tira espaços em branco
            candidatos.push(input.value.trim());
        }
    });

    console.log("Eleição Criada:", nomeEleicao);
    console.log("Candidatos:", candidatos);
    console.log("Data de Início:", dataInicio);
    console.log("Data de Fim:", dataFim);

    alert(`Eleição '${nomeEleicao}' criada com ${candidatos.length} candidatos de ${dataInicio} a ${dataFim}!`);
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


async function pedirToken(tipo) {
    const email = document.getElementById("email").value;

    if (!email || email.trim() === "") {
        alert("Por favor, insere o email.");
        return;
    }

    const res = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            tokenType: tipo
        })
    });

    const data = await res.json();

    if (res.ok) {
        alert(data.message);

        // redireciona com dados na URL (sem localStorage)
        window.location.href =
            "enviar_token.html?type=" + tipo +
            "&email=" + encodeURIComponent(email);

    } else {
        alert(data.error);
    }
}


function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        email: params.get("email"),
        tokenType: params.get("type")
    };
}


async function verificar_token() {
    const { email, tokenType } = getQueryParams();
    const token = document.getElementById("token").value;

    if (!email || !tokenType) {
        alert("Sessão inválida. Volta ao início.");
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
            email,
            token,
            tokenType
        })
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);

        // redirecionamento baseado no tipo
        if (tokenType === "login" || tokenType === "register") {
            window.location.href = "votar_ou_criar.html";
        }
        else if (tokenType === "vote") {
            window.location.href = "votar.html";
        }
        else if (tokenType === "create") {
            window.location.href = "criar_eleicao.html";
        }

    } else {
        alert(data.error);
    }
}
