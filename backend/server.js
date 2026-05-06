// AUTENTICAÇÃO via email usando tokens de uso único
// Token para verificar email (Atutenticação)
require("dotenv").config();
const express = require("express");
const path = require("path");
const { generateToken } = require("./utils/token");
const { sendTokenEmail } = require("./utils/email");
const { hashToken } = require("./utils/hmac");
const Token = require("./models/Token");
const app = express();

app.use(express.static(path.join(__dirname, "../app/public"))); // Serve arquivos estáticos da pasta "public" (index.html, css, js, etc.)



const connectDB = require("./base_de_dados.js");
connectDB();
app.use(express.json());

const TOKEN_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos

// - Pedir token - login

app.post("/login", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
    }

    //token.js criar token
    const token = generateToken();

    //hmac.js criar hash do token

    const tokenHash = hashToken(token, email);

    //usar mongodb para guardar o token

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_TIME); //new Date(), pois esta não transforma em string e no formato correto

    await Token.findOneAndUpdate(
        { email },
        { tokenHash, expiresAt },
        { upsert: true, new: true },  //se não existir, cria um novo documento e retorna o documento atualizado ou criado
    );

    await sendTokenEmail(email, token);

    return res.json({  message: "Token gerado e enviado"
    });
});


// Verificar token

app.post("/verify-token", async(req, res) => {  //async porque vamos usar await para operações assíncronas (acesso à base de dados)
    const { email, token } = req.body;

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

    // Verificar se o hash do token corresponde
    const tokenHash = hashToken(token, email);

    if (tokenHash !== tokenData.tokenHash) {
        return res.status(400).json({ error: "Token inválido" });
    }

    // Remover o token após verificação
    await Token.deleteOne({ email });

    return res.json({ message: "Autenticado com sucesso" });
});


//arrancar server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});









// Realizar VOTO ou CRIAR VOTAÇÃO (TOKENS)

