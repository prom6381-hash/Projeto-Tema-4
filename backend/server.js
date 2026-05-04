
// Token para verificar email (Atutenticação)

const express = require("express");
const { generateToken } = require("./backend/utils/token");
const { sendTokenEmail } = require("./backend/utils/email");
const { hashToken } = require("./backend/utils/hmac");


const app = express();

app.use(express.json());

//DEPOIS TEREMOS DE TROCAR PELO MONGO DB

let tokens = {};

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

    //isto se calhar vai ser alterado quando usarmos mongo db, mas por agora vamos guardar o token e o email num objeto em memória
    tokens[email] = { 
        tokenHash,
        expiresAt: Date.now() + TOKEN_EXPIRATION_TIME
    };

    await sendTokenEmail(email, token);

    return res.json({  message: "Token gerado e enviado"
    });
});


// Verificar token

