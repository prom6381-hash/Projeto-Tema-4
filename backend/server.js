// AUTENTICAÇÃO via email usando tokens de uso único
// Token para verificar email (Atutenticação)
require("dotenv").config();
const express = require("express");
const path = require("path");
const { generateToken } = require("./utils/token");
const { sendTokenEmail } = require("./utils/email");
const { hashToken } = require("./utils/hmac");
const Token = require("./models/Token");
const User = require("./models/User");
const app = express();

app.use(express.static(path.join(__dirname, "../app/public"))); // Serve arquivos estáticos da pasta "public" (index.html, css, js, etc.)



const connectDB = require("./base_de_dados.js");
const { message } = require("statuses");
connectDB();
app.use(express.json());

const TOKEN_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos

// - Pedir token - login

app.post("/login", async (req, res) => {
    const { email, tokenType } = req.body;
    
    if (!email || !tokenType) {
        return res.status(400).json({ error: "Dados inválidos" });
    }

    //token.js criar token
    const token = generateToken();

    //hmac.js criar hash do token

    const tokenHash = hashToken(token, email);

    //usar mongodb para guardar o token

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_TIME); //new Date(), pois esta não transforma em string e no formato correto

    await Token.findOneAndUpdate(
        { email },
        { tokenHash, expiresAt, tokenType},
        { upsert: true, new: true },  //se não existir, cria um novo documento e retorna o documento atualizado ou criado
    );

    await sendTokenEmail(email, token);

    return res.json({  message: "Token gerado e enviado"
    });
});


// Verificar token

app.post("/verify-token", async(req, response) => {  //async porque vamos usar await para operações assíncronas (acesso à base de dados)
    const { email, token, tokenType } = req.body;

    if (!email || !token || !tokenType) {
        return response.status(400).json({ error: "Email e token são obrigatórios" });
    }
    
    const tokenData = await Token.findOne({ email });

    
    if (!tokenData) {
        return response.status(400).json({ error: "Token inválido ou expirado" });
    }

    if (tokenData.blockedUntil && tokenData.blockedUntil > Date.now()) {
    return response.status(429).json({
        error: "Demasiadas tentativas. Tenta mais tarde."
    });
    }



    // Verificar se o token ainda é válido
    if (Date.now() > tokenData.expiresAt) {
        await Token.deleteOne({ email }); // deleteOne é um comando do mongoose
        return response.status(400).json({ error: "Token expirado" });
    }




    // Verificar se o tipo do token corresponde
    if (tokenData.tokenType !== tokenType) {
        tokenData.attempts += 1;
        await tokenData.save();

        return response.status(400).json({ error: "Tipo de token inválido" })
    }
    

    // Verificar se o hash do token corresponde
    const tokenHash = hashToken(token, email);

    if (tokenHash !== tokenData.tokenHash) {
        tokenData.attempts += 1;

        if (tokenData.attempts >= 5) { // Limite de tentativas para evitar ataques de força bruta
            tokenData.blockedUntil = new Date(Date.now() + 5 * 60 * 1000); // Bloqueia por 15 minutos
            tokenData.attempts = 0; // Reseta o contador de tentativas após bloquear
        }   
        await tokenData.save();

        return response.status(400).json({ error: "Token inválido" });
    }   else {
        tokenData.attempts = 0; // Reseta o contador de tentativas após uma verificação bem-sucedida
        tokenData.blockedUntil = null;
        await tokenData.save();
    }


    if (tokenType === "register") {
        return response.json({
            message: "Token válido",
        });
    }


    if (tokenType === "login") {
        return response.json({
            message: "Token válido",
        });
    }

    if (tokenType === "vote") {
        return response.json({ message: "Token de voto verificado com sucesso" });
    }

    if (tokenType === "create") {
        return response.json({ message: "Token de criação verificado com sucesso" });
    }

    if (tokenType !== "register" && 
        tokenType !== "login" && 
        tokenType !== "vote" && 
        tokenType !== "create") {
        return response.status(400).json({ error: "Tipo de token inválido" });
    }
});



//arrancar server

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});


// FAZER a parte que corre resultados de eleições
app.get("/api/eleicoes/:id/resultado", async(req,response)=>{

    try{
        const id= req.params.id;
        const eleicao= await Eleicao.findById(id);

        if (!eleicao){
            return response.status(404).json({error:'Não encontrámos a eleição'});
        }
        
        const votos1=await Voto.find({eleicaoId: id});

        const votosTotal= {};
        votos1.forEach(total =>{
            if (votosTotal[total.candidato]){
                ++votosTotal[total.candidato];
            } else{
                votosTotal[total.candidato]=1;
            }
        });

        const votosTodos= votos1.length;
        const resultados= eleicao.candidatos.map(candidatos2=>{
            const votoCandidato=votosTotal[candidatos2];
            return{
                nome: candidatos2,
                votos: votoCandidato,
                percentagem: votosTodos>0
                    ? Number(votosCandidato / votosTodos * 100).toFixed(1) 
                    : 0
            };
        });
        response.json({
            nome: eleicao.nome,
            dataInicio: eleicao.dataInicio,
            dataFim: eleicao.dataFim,
            totalVotos: votosTodos, 
            resultados: resultados
        });
    } catch(erro3){
        response.status(500).json({erro3:"Erro ao buscar os reesultados da eleição!"})
    }
});



app.post("/create-password", async(req,response)=>{ //primeiro cria o utlizador (usando token e email) e depois cria a password:
    const { email, password } = req.body;

    if (!email || !password) {
        return response.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return response.status(404).json({ error: "Utilizador não encontrado" });
    }   

    const response = await fetch("http://servidor-ca:5000/verify-token", { //no porto 5000, pois é o porto onde o servidor CA está a correr, que tem as funções do ficheiro auth.py
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
    });

    const data = await response.json();

    user.passwordHash = data.hash;
    user.salt = data.salt;
    user.isVerified = true;

    await user.save();

    return res.json({ message: "Password criada com sucesso" });
});


app.post("/verificar_password", async(req,response)=>{
    const { email, password } = req.body;

    if (!email || !password) {
        return response.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return response.status(404).json({ error: "Utilizador não encontrado" });
    }   
    
    const response = await fetch("http://servidor-ca:5000/verify-password", { //no porto 5000, pois é o porto onde o servidor CA está a correr, que tem as funções do ficheiro auth.py
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password, salt: user.salt, hash: user.passwordHash })
    });

    const data = await response.json();

    if (data.valid) {
        return res.json({ message: "Password verificada com sucesso, login realizado" });
    } else {
        return res.status(400).json({ error: "Password inválida" });
    }
});








// Realizar VOTO ou CRIAR VOTAÇÃO (TOKENS)

