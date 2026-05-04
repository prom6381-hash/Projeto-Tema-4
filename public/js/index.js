// O QUE COLOQUEI AQ É SÓ PARA SER USADO NO FUTURO AINDA N ESTÁ A FUNCIONAR

const nome = "Tiago"; // Um exemplo qualquer
const elemento = document.getElementById('mensagem-autenticado');

elemento.innerHTML = `Utilizador ${nome} Autenticado ✅`;



const candidatos = ["Candidato A", "Candidato B"]; // Isto viria do utilizador

const lista = document.getElementById('lista-candidatos');

candidatos.forEach((nome, index) => {
    lista.innerHTML += `
        <div class="card-voto" onclick="selecionar(${index})">
            <span>👤</span>
            <span>${nome}</span>
            <input type="checkbox" id="check-${index}">
        </div>
    `;
});






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



// Token para verificar email (Atutenticação)

const express = require("express");
const { generateToken } = require("./backend/utils/token");

const app = express();

app.use(express.json());

//DEPOIS TEREMOS DE TROCAR PELO MONGO DB

let tokens = {};

const TOKEN_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos

// - Pedir token - login

//app.post("/login", (req, res) => {
    //const { email } = req.body;

    //if (!email) {
    //    return res.status(400).json({ error: "Email é obrigatório" });
    //}

    const token = generateToken();
    tokens[token] = { 
        token: token,
        email: email,
        expiresAt: Date.now() + TOKEN_EXPIRATION_TIME
    };

    return res.json({ token });
