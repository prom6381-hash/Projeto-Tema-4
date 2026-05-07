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

app.post("/verify-token", async(req, res) => {  //async porque vamos usar await para operações assíncronas (acesso à base de dados)
    const { email, token, tokenType } = req.body;


    if (!email || !token || !tokenType) {
        return res.status(400).json({ error: "Email e token são obrigatórios" });
    }
    
    const tokenData = await Token.findOne({ email });


    // Verificar se o token é válido 
    if (!tokenData) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
    }
    
    // Verificar se o token ainda é válido
    if (Date.now() > tokenData.expiresAt) {
        await Token.deleteOne({ email }); // deleteOne é um comando do mongoose
        return res.status(400).json({ error: "Token expirado" });
    }

    // Verificar se o tipo do token corresponde
    if (tokenData.tokenType !== tokenType) {
        return res.status(400).json({ error: "Tipo de token inválido" });
    }

    // Verificar se o hash do token corresponde
    const tokenHash = hashToken(token, email);

    if (tokenHash !== tokenData.tokenHash) {
        return res.status(400).json({ error: "Token inválido" });
    }


    if (tokenType === "register") {
        // Criar o utilizador na base de dados
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ error: "Utilizador já existe" });
        }


        // Criar o utilizador em memoria (temporariamente)
        const user = new User({ email });

        // Pedir certificado 
        const certResponse = await fetch("http://servidor-ca:5000/sign", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const certData = await certResponse.json();

        if (!certResponse.ok) {
            return res.status(500).json({ error: "Erro ao obter certificado" });
        }


        //guarda em memoria temporariamente
        user.certificate = certData.certificate;
        user.publicKey = certData.publicKey;
        user.isVerified = true;

        //guarda na bd
        await user.save();

        return res.json({ message: "Registo e certificado criados com sucesso" });
    }   

    if (tokenType === "login") {
        // Verificar se o utilizador existe
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: "Utilizador não encontrado" });
        }

        return res.json({ message: "Autenticação bem-sucedida" });
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

    // Remover o token após verificação
    await Token.deleteOne({ email });
});



//arrancar server

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});


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





// Realizar VOTO ou CRIAR VOTAÇÃO (TOKENS)

