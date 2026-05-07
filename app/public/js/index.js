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




<<<<<<< Updated upstream
async function pedirTokenLogin() {
    await pedirToken("login");
=======
            const data= document.createElement("p");
            data.textContent=`Eleição ocorre de ${dataComeco} até ${dataAcaba}`;
            exibir.appendChild(data);

            const atual= new Date;
            const comeco= new Date(exibir.dataInicio);
            const acaba= new Date(exibir.dataFim);
            let estado;
            
            if (comeco <= atual && acaba>= atual){
                estado="Eleição atualmente ativa e a decorrer!"
            }
            else{
                estado="A eleição ainda não começou ou já acabou!"
            }

            const estado1=document.createElement("p");
            estado1.textContent=estado;
            exibir.appendChild(estado1);

            const eleicaobutao= document.createElement("button");
            eleicaobutao.textContent='Ver resultados da eleição';
            eleicaobutao.onclick=function(){
                resultados_eleicoes(exibir._id);
            };
            exibido.appendChild(eleicaobutao);
            dados.appendChild(eleicaobutao);
        });
    }  catch (erro){
        console.error("O erro é", erro);
        const dados= document.getElementById("resultados").value;
        dados.innerHTML='<p> Erro! Tente de novo!</p>' 
    }
}
async function resultados_eleicoes(id){
    try{
        const endereco=await fetch(`http://localhost:4000/api/eleicoes/${id}/resultados`);
        if (!endereco.ok){
            alert("Erro ao obter o resultado da eleição!");
            return;}
        const info1= await endereco.json();
        const dados= document.getElementById("resultados").value;
        dados.innerHTML='';
        
        const titulo1= document.createElement("h2");
        titulo1.textContent=info1.nome;
        dados.appendChild(titulo1);

        const numero_votos=document.createElement("p");
        numero_votos.TextContext=`Votos totais:${info1.totalVotos}`;
        dados.appendChild(numero_votos);

        info1.resultados.forEach(candidatos1=>{
            const novo= document.createElement("p");
            novo.textContent=`${candidatos1.nome}:Tem ${candidatos1.votos} votos(${candidatos1.percentagem}%)`;
            dados.appendChild(novo);

            const barra = document.createElement('div');
            barra.style.background = '#e0e0e0';
            barra.style.height = '24px';
            barra.style.borderRadius = '4px';
            barra.style.marginBottom = '15px';

            const barracheia = document.createElement('div');
            barracheia.style.background = '#3498db';
            barracheia.style.height = '100%';
            barracheia.style.width = `${candidato.percentagem}%`;
            barracheia.style.borderRadius = '4px';
            barracheia.textContent = `${candidato.percentagem}%`;
            barracheia.style.color = 'white';
            barracheia.style.fontSize = '12px';

            barra.appendChild(barracheia);
            dados.appendChild(barra);

            const butao1=document.createElement("button");
            butao1.TextContext='Ver outras eleições';
            butao1.onclick = ver_eleicoes();
            dados.appendChild(butao1);

        });
    } catch(erro1){
        console.error("Ocorreu o erro:",erro1);
        alert("Houve um erro, tente novamente!");
        return;
    }
} 
// Pedir token - login

async function pedir_token() {

    console.log("clicou no botão pedir token");
    const email = document.getElementById('email').value;

    if (email.trim() === "") {
        alert("Por favor, insira o email.");
        return;
    }
    
    const response = await fetch("/login", {   //esperar que será enviado para o backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },    //cabeçalho para indicar que o corpo da requisição é JSON
        body: JSON.stringify({ email }) // email: "XXXX@gmail.com" 
    });
    const data = await response.json();
    alert(data.message);
    localStorage.setItem('email', email); //guardar email no localStorage para usar depois na verificação do token
    window.location.href = "verificar_token.html"; //redirecionar para a página de verificação do token
} // email → fetch → backend (/login) → gera token → envia email → resposta → alert

=======
>>>>>>> 68e1d563e91e25bd133590aef9e50b7d8e7bebb9

// Verificar token
async function verificar_token() {
    const { email, tokenType } = getQueryParams();
    const token = document.getElementById("token").value;

    if (!email || !tokenType) {
        alert("Sessão inválida. Volta ao início.");
        window.location.href = "index.html";
        return;
    }   

    if (!token || token.trim() === "") {
        alert("Por favor, insira o token.");
        return;
    }

    const response = await fetch("/verify-token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, tokenType })
    });

    const data = await response.json();

    if (response.ok) { // se a resposta for 200 - 299: sucesso 
        alert(data.message);
    
        if (tokenType === "register" || tokenType === "login") {
        window.location.href = "votar_ou_criar.html";
    }

        else if (tokenType === "vote") {
        window.location.href = "votar.html"; 
    }

        else if (tokenType === "create") {
        window.location.href = "criar_eleicao.html"; 
    }

    else {
        alert(data.error);
        }
    }
>>>>>>> Stashed changes
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
            "verificar_token.html?type=" + tipo +
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
