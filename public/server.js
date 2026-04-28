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
