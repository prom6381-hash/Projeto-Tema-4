// AUTENTICAÇÃO via email usando tokens de uso único
// Token para verificar email (Atutenticação)
require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto= require("crypto");
const { generateToken } = require("./utils/token");
const { sendTokenEmail } = require("./utils/email");
const { hashToken } = require("./utils/hmac");
const Token = require("./models/Token");
const User = require("./models/User");
const Voto = require("./models/Voto");
const Eleicao= require("./models/election");
const app = express();

app.use(express.static(path.join(__dirname, "../app/public"))); // Serve arquivos estáticos da pasta "public" (index.html, css, js, etc.)



const connectDB = require("./base_de_dados.js");
const { message } = require("statuses");
connectDB();
app.use(express.json());

const TOKEN_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos

// - Pedir token - login

const sessoesVotar={}; // armazenar temporariamente as sessões de votação a ocorrerem


async function gerarchavesDH(){
    const response= await fetch("http://servidor-ca:5000/dh/gerar-chaves", {method: "POST"});
    return await response.json();
}

async function calculoChaveSessao(chavepub_remota){
    const response= await fetch("http://servidor-ca:5000/dh/chave-sessao", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave_publica_remota: chavepub_remota})});
    return await response.json();
}

async function assinaturaRSA(chavepubRSA,dados,assinatura){
    const response= await fetch("http://servidor-ca:5000/rsa/integridade", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave_publica: chavepubRSA,
        dados: dados,
        assinatura: assinatura
    })});
    return await response.json();
}

async function desencriptarVoto(chave,AAD,iv,votoCifrado,tag){
    const response= await fetch("http://servidor-ca:5000/aes/desencriptar", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave:chave, 
        data_associada:AAD,
        iv:iv,
        voto_cifrado:votoCifrado,
        tag:tag
    })});
    return await response.json();
}




app.post("/login", async (req, res) => {
    const { email, tokenType } = req.body;
    
    if (!email || !tokenType) {
        return res.status(400).json({ error: "Dados inválidos" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser && tokenType === "register") {
        return res.status(404).json({ error: "Utilizador já existe" });
    }


    if (!existingUser && tokenType === "login") {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    if (tokenType !== "register" && tokenType !== "login" && tokenType !== "vote" && tokenType !== "create") {
        return res.status(400).json({ error: "Tipo de token inválido" });
    }

    if (!existingUser) {
        await User.create({ email, isVerified: false }); //cria um novo utilizador com o email fornecido e isVerified como false (antes de criar password)
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

app.post("/verify-token", async(req, res) => {  //async porque vamos usar await para operações assíncronas (acesso à base de dados)
    const { email, token, tokenType } = req.body;

    if (!email || !token || !tokenType) {
        return res.status(400).json({ error: "Email e token são obrigatórios" });
    }
    
    const tokenData = await Token.findOne({ email });

    
    if (!tokenData) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    if (tokenData.blockedUntil && tokenData.blockedUntil > Date.now()) {
    return res.status(429).json({
        error: "Demasiadas tentativas. Tenta mais tarde."
    });
    }



    // Verificar se o token ainda é válido
    if (Date.now() > tokenData.expiresAt) {
        await Token.deleteOne({ email }); // deleteOne é um comando do mongoose
        return res.status(400).json({ error: "Token expirado" });
    }



    
    // Verificar se o tipo do token corresponde
    if (tokenData.tokenType !== tokenType) {
        tokenData.attempts += 1;
        await tokenData.save();

        return res.status(400).json({ error: "Tipo de token inválido" })
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

        return res.status(400).json({ error: "Token inválido" });
    }   else {
        tokenData.attempts = 0; // Reseta o contador de tentativas após uma verificação bem-sucedida
        tokenData.blockedUntil = null;
        await tokenData.save();
    }


    if (tokenType === "register") {
        return res.json({
            message: "Token válido",
        });
    }


    if (tokenType === "login") {
        return res.json({
            message: "Token válido",
        });
    }

    if (tokenType === "vote") {
        return res.json({ message: "Token de voto verificado com sucesso" });
    }

    if (tokenType === "create") {
        return res.json({ message: "Token de criação verificado com sucesso" });
    }

    if (tokenType !== "register" && 
        tokenType !== "login" && 
        tokenType !== "vote" && 
        tokenType !== "create") {
        return res.status(400).json({ error: "Tipo de token inválido" });
    }
});


app.post("/api/iniciar-votacao", async (req,res)=>{
    try{
        const {email,chavepub_remota,assinatura}= req.body;
        if (!email || !chavepub_remota || !assinatura){
            return res.status(400).json({error:"Dados incompletos ou não preenchidos!"});
        }

        const user=await User.findOne({email});
        if (!user){
            return res.status(404).json({error:"Utilizador não foi encontrado!"});
        }

        if (!user.chavePublicaRSA){
            return res.status(400).json({error:"Não foi registado a chave RSA!"});
        }

        const verificar= await assinaturaRSA(
            user.chavePublicaRSA,
            chavepub_remota,
            assinatura
        );

        if (!verificar.valida){
            return res.status(401).json({error: "Autenticação com a assinatura falhou!!"});
        }

        const chavesDH= await gerarchavesDH();
        const sessao= await calculoChaveSessao(chavepub_remota);
        const idSessao= crypto.randomBytes(16).toString("hex");

        sessoesVotar[idSessao]={
            email:email,
            chaveSessao:sessao.chave_sessao

        };
        return res.json({
            id_sessao: idSessao,
            chave_publica_dh: chavesDH.chave_publica
        });

    }  catch (erro){
        console.error("Erro ao começar a votação, o erro foi:", erro);
        return res.status(500).json({error: "Houve um erro interno ao começar a votação!"})
    }
})

app.post("/api/votar", async(req,res)=>{
    try{
        const {id_sessao,votoCifrado,iv,tag,AAD,idEleicao}= req.body;
        if (!id_sessao || !votoCifrado || !iv || !tag || !AAD || !idEleicao){
            return res.status(400).json({error:"Dados incompletos ou não preenchidos!"});
        }

        if (!sessoesVotar[id_sessao]){
            return res.status(401).json({error:"A sessão é inválida ou expirou!"});
        }

        const sessao=sessoesVotar[id_sessao];
        const desencriptado= await desencriptarVoto(
            sessao.chaveSessao,
            AAD || idEleicao,
            iv,
            votoCifrado,
            tag
        );

        const guardarVoto= new Voto({
            eleicaoId: idEleicao,
            candidato: desencriptado.voto,
            eleitor: sessao.email
        });
        await guardarVoto.save();

        delete sessoesVotar[id_sessao];
        return res.json({ message: "O voto foi corretamente registado!"});

    } catch(erro){
        console.error("Houve um erro ao votar, que foi:", erro);
        return res.status(500).json({error: "Houve um erro interno ao tentar registar o voto!"})
    }
})

// FAZER a parte que corre resultados de eleições
app.get("/api/eleicoes/:id/resultado", async(req,res)=>{

    try{
        const id= req.params.id;
        const eleicao= await Eleicao.findById(id);

        if (!eleicao){
            return res.status(404).json({error:'Não encontrámos a eleição'});
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
        res.json({
            nome: eleicao.nome,
            dataInicio: eleicao.dataInicio,
            dataFim: eleicao.dataFim,
            totalVotos: votosTodos, 
            resultados: resultados
        });
    } catch(erro3){
        res.status(500).json({erro3:"Erro ao buscar os reesultados da eleição!"})
    }
});



app.post("/create-password", async(req,res)=>{ //primeiro cria o utlizador (usando token e email) e depois cria a password:
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }   

    const response = await fetch("http://servidor-ca:5000/hash-password", { //no porto 5000, pois é o porto onde o servidor CA está a correr, que tem as funções do ficheiro auth.py
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
    });
        
    const certResponse = await fetch("http://servidor-ca:5000/sign", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    });
    
    const data = await response.json();

    const certData = await certResponse.json();


    user.certificate = certData.certificate; //guarda o certificado do utilizador na base de dados
    user.passwordHash = data.hash;
    user.salt = data.salt;
    user.isVerified = true;

    await user.save();

    return res.json({ message: "Password criada com sucesso" });
});


app.post("/verificar_password", async(req,res)=>{
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }   
    
    const response = await fetch("http://servidor-ca:5000/verify-password", { //no porto 5000, pois é o porto onde o servidor CA está a correr, que tem as funções do ficheiro auth.py
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password, salt: user.salt, hash: user.passwordHash })
    });



    const data = await response.json();

    if (!data.valid) {
        return res.status(400).json({ error: "Password inválida" });
    }

    //certificado   

    const certResponse = await fetch("http://verify-server:6060/verify_certificate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ certificate: user.certificate })
    });
    

    const certData = await certResponse.json();
    

    if (!certData.valid) {
        return res.status(400).json({ error: "Certificado inválido" });
    }

    return res.json({ message: "Autenticação bem-sucedida", subject: certData.subject });
});







//arrancar server

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});