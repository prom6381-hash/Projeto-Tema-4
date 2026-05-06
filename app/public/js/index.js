
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


// Verificar token
async function verificar_token() {
    const email = document.getElementById('email').value;
    const token = document.getElementById('token').value;
    if (token.trim() === "") {
        alert("Por favor, insira o token.");
        return;
    }

    const response = await fetch("/verify-token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })