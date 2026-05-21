// AUTENTICAÇÃO via email usando tokens de uso único
// Token para verificar email (Autenticação)
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto= require("crypto");
const { generateToken } = require("./utils/token");
const { sendTokenEmail } = require("./utils/email");
const { hashToken } = require("./utils/hmac");
const Token = require("./models/Token");
const User = require("./models/User");
const Voto = require("./models/Voto");
const Eleicao= require("./models/election");  
const EleicaoEleitor = require("./models/eleicaoEleitor");
const app = express();
const rateLimit = require("express-rate-limit");
const cors = require("cors");

app.use(express.static("/app/public")); // Serve ficheiros estáticos da pasta "public" (index.html, css, js, etc.)
console.log("DIRNAME:", __dirname);
console.log("PATH PUBLIC:", path.join(__dirname, "../app/public"));

// Configuração das sessões de utilizador
app.use(session({
    secret: process.env.JWT_SECRET || "segredo", // segredo para assinar a sessão, deve ser uma string longa e segura em produção
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false  , maxAge: 1 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' } 
}));



const connectDB = require("./base_de_dados.js");
connectDB(); // Estabelece a ligação à base de dados MongoDB
app.use(express.json());

const TOKEN_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos

// - Pedir token - login

const sessoesVotar={}; // armazenar temporariamente as sessões de votação a ocorrerem


app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

//serve o ficheiro HTML da aplicação
app.get("/", (req, res) => {
    res.sendFile("/app/public/index.html");
});

app.get("/index.html", (req, res) => {
    res.sendFile("/app/public/index.html");
});

// Limita a 5 tentativas de login por IP a cada 5 minutos (proteção contra brute force)
const loginLimiter = rateLimit({
    windowMs: 5* 60 * 1000,
    max: 5 ,
    //keyGenerator: (req) => req.body.email, ----- COLOCAR ISTO PARA BLOQUEAR POR EMAIL, SEM ISTO É POR IP
    keyGenerator: (req) => {           // Bloqueia por IP, mas apenas conta caso o ultimo token for igual ao atual
            const ip = req.ip;
            const email = req.body.email || req.session?.user?.email || "anonimo";
            const tokenType = req.body.tokenType || "desconhecido";
            
            // Exemplo de chave gerada: "127.0.0.1_teste@email.com_vote"
            return `${ip}_${email}_${tokenType}`;
        },
    handler: (req, res) => {  //costuma a resposta 
        return res.status(429).json({
            error: "Demasiadas tentativas. Tente novamente mais tarde."
        });
    }
});


const eleicaoLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    keyGenerator: (req) => {
        // Bloqueia a combinação do IP com a Eleição que está a tentar aceder
        return `${req.ip}_${req.body.idEleicao || 'global'}`;
    },
    handler: (req, res) => {
        return res.status(429).json({
            error: "Demasiadas tentativas de senha para esta eleição. Tente novamente daqui a 5 minutos."
        });
    }
});






function gerarCodigoEleicao() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Solicita ao servidor CA a geração de um par de chaves Diffie-Hellman
async function gerarchavesDH() {
    const response = await fetch("http://servidor-ca:5000/dh/gerar-chaves", {
        method: "POST"
    });
    return await response.json();
}

// Calcula a chave de sessão ECDH a partir da chave pública do cliente
async function calculoChaveSessao(chavepub_remota){
    const chavePEM=base64ParaPEM(chavepub_remota,"PUBLIC KEY") //mesmo erro que tive na assinaturaRSA
    const response= await fetch("http://servidor-ca:5000/dh/chave-sessao", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave_publica_remota: chavePEM})});
    const text = await response.text();
    console.log("Resposta sessão ECDH:", text.substring(0, 200));
    
    if (!response.ok) {
        throw new Error(`Erro sessão ECDH: ${text}`);
    }

    return JSON.parse(text);
}
function base64ParaPEM(base64,type){  //tive de fazer esta função pq ao votar estava a dar erro interno pq o servidor estava a compara um ficheiro pem com um base64(browser)
    const linhas= base64.match(/.{1,64}/g); // Estava a dar este erro--> ValueError: Unable to load PEM file. MalformedFraming
    const body= linhas.join('\n');
    return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----`;
}

function PEMparabase64(pem){  //tive de fazer esta função pq ao votaar estava a dar erro Houve um erro ao tentar processar o voto!! 
    //Estava a dar este erro--> ValueError: Unable to load PEM file. MalformedFraming
    return pem// Pq, no calculo de chaves sessao utilizei a chave publica do cliente para ser convertido para PEM e não base64(SPKI)
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\n/g, '')
        .trim();                
}

// Verifica a assinatura RSA de um dado junto do servidor CA
// Garante autenticidade e integridade dos dados enviados pelo cliente
async function assinaturaRSA(chavepubRSA,dados,assinatura){
    const chavePEM=base64ParaPEM(chavepubRSA,"PUBLIC KEY") 
    console.log("Chave PEM enviada:", chavePEM.substring(0, 100) + "...");
    const response= await fetch("http://servidor-ca:5000/rsa/integridade", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave_publica: chavePEM,
        dados: dados,
        assinatura: assinatura
    })});
    const text = await response.text();
    console.log("Resposta do servidor-ca:", text.substring(0, 200));
    
    if (!response.ok) {
        throw new Error(`Erro RSA: ${text}`);
    }

    return JSON.parse(text);
}

// Desencripta um voto cifrado com AES-GCM usando a chave de sessão ECDH
async function desencriptarVoto(chave,AAD,iv,votoCifrado,tag){
    console.log("AES - chave:", chave);
    console.log("AES - AAD:", AAD);
    console.log("AES - iv:", iv);
    const response= await fetch("http://servidor-ca:5000/aes/desencriptar", {method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chave:chave, 
        data_associada:AAD,
        iv:iv,
        voto_cifrado:votoCifrado,
        tag:tag
    })});
    const text = await response.text();
    console.log("Resposta AES:", text.substring(0, 300));
    
    if (!response.ok) {
        throw new Error(`Erro AES: ${text}`);
    }
    
    return JSON.parse(text);
}



// Rota de login — gera e envia token por email consoante o tipo de operação
// tokenType: "register" | "login" | "vote" | "create"
app.post("/login", loginLimiter, async (req, res) => {
    const { tokenType } = req.body;
    console.log("1. tokenType:", tokenType);

    if (!tokenType) {
        console.log("2. FALHOU: tokenType vazio");
        return res.status(400).json({ error: "Dados inválidos" });
    }

    let email;
    // Para votar ou criar, o utilizador já tem de estar autenticado via sessão
    if (tokenType === "vote" || tokenType === "create") {
        console.log("3. vote/create - sessão:", req.session?.user?.email);
        if (!req.session || !req.session.user || !req.session.user.email) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        email = req.session.user.email;
    } else {
        email = req.body.email;
    }
    console.log("4. email:", email);

    if (!email) {
        console.log("5. FALHOU: email vazio");
        return res.status(400).json({ error: "Email obrigatório" });
    }

    const existingUser = await User.findOne({ email });
    
    console.log("existingUser:", existingUser ? existingUser.email : "null");

    if (tokenType === "register") {
    console.log("REGISTO: existingUser.isVerified:", existingUser?.isVerified);
    // Impede o registo se o utilizador já existir e estiver verificado
    if (existingUser && existingUser.isVerified) {
        console.log("REGISTO: Utilizador já existe e está verificado");
        return res.status(400).json({ error: "Utilizador já existe" });
    }
    // Remove utilizador não verificado para permitir novo registo
    if (existingUser) {
        console.log("REGISTO: Apagando utilizador não verificado");
        await User.deleteOne({ email });
    }
    console.log("REGISTO: Criando novo utilizador");
    await User.create({ email, isVerified: false });
    }   

    // LOGIN
    // Garante que apenas utilizadores verificados conseguem fazer login
    if (tokenType === "login") {
        if (!existingUser || !existingUser.isVerified) {
            return res.status(404).json({ error: "Utilizador não encontrado" });
        }
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }


    // Gera token, faz hash e define expiração
    const token = generateToken();
    const tokenHash = hashToken(token, user._id.toString());
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_TIME);

    //garante apenas um token ativo por tipo
    await Token.findOneAndUpdate(
        {
            userId: user._id.toString(),
            tokenType
        },
        {
            tokenHash,
            expiresAt,
            tokenType,
            userId: user._id.toString()
        },
        {
            upsert: true,
            new: true
        }
    );
//Envia o token em texto simples por email (o hash fica guardado na BD)
        await sendTokenEmail(email, token);

    return res.json({ message: "Token gerado e enviado" });
});


//Verifica o token submetido pelo utilizador e valida a autenticação

app.post("/verify-token", async(req, res) => {  //async porque vamos usar await para operações assíncronas (acesso à base de dados)
    const {token, tokenType } = req.body;

    let email; // Declarar a variável email fora do bloco if para que possa ser usada posteriormente. Caso não fosse assim, daria erro de "email is not defined"

    // Para vote/create, usa o email da sessão ativa em vez do corpo do pedido
    if (tokenType == "vote" || tokenType == "create") {
        if (!req.session || !req.session.user || !req.session.user.email) {
            return res.status(401).json({ error: "O utilizador não está autenticado!" });
        }
        else {
            email = req.session.user.email;
        }
    } else {
        email = req.body.email; //login e registo, onde o email é fornecido no corpo da requisição
    }

    if (!email || !token || !tokenType) {
        return res.status(400).json({ error: "Email e token são obrigatórios" });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }
    const tokenData = await Token.findOne({ userId: user._id.toString(), tokenType});

    
    if (!tokenData) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    // Verifica se o utilizador está temporariamente bloqueado por excesso de tentativas
    if (tokenData.blockedUntil && tokenData.blockedUntil > Date.now()) {
    return res.status(429).json({
        error: "Demasiadas tentativas. Tenta mais tarde."
    });
    }



    // Verificar se o token ainda é válido
    if (Date.now() > tokenData.expiresAt) {
        await Token.deleteOne({ userId: user._id.toString(), tokenType}); // deleteOne é um comando do mongoose
        return res.status(400).json({ error: "Token expirado" });
    }



    
    // Verificar se o tipo do token corresponde
    if (tokenData.tokenType !== tokenType) {
        tokenData.attempts += 1;
        await tokenData.save();

        return res.status(400).json({ error: "Tipo de token inválido" })
    }
    

    // Verificar se o hash do token corresponde
    const tokenHash = hashToken(token, user._id.toString());

    if (tokenHash !== tokenData.tokenHash) {
        tokenData.attempts += 1;

        if (tokenData.attempts >= 5) { // Limite de tentativas para evitar ataques de força bruta
            tokenData.blockedUntil = new Date(Date.now() + 5 * 60 * 1000); // Bloqueia por 15 minutos
            tokenData.attempts = 0; // Reseta o contador de tentativas após bloquear
        }   
        await tokenData.save();

        return res.status(400).json({ error: "Token inválido" });
    }   else {
        // Token correto — reset do contador de tentativas e bloqueio
        tokenData.attempts = 0;
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

// Inicia uma sessão de votação segura com troca de chaves ECDH e verificação RSA
app.post("/api/iniciar-votacao", async (req,res)=>{
    try{

        console.log("SESSÃO:", req.session);           // para ver o que está a dar erro vvvv
        console.log("USER:", req.session.user);        // ""
        console.log("BODY:", req.body);                 //""

        const {chavepub_remota,assinatura}= req.body;
        if (!req.session || !req.session.user || !req.session.user.email){
            console.log("A sessão é inválida");
            return res.status(401).json({error:"Utilizador não autenticado!!"});
        }

        const email= req.session.user.email;
        if (!chavepub_remota || !assinatura){
            console.log("FALHOU: dados incompletos");  //  aqui tmb
            console.log("email:", email);
            console.log("chavepub:", chavepub_remota ? "existe" : "FALTA");
            console.log("assinatura:", assinatura ? "existe" : "FALTA");
            return res.status(400).json({error:"Dados incompletos ou não preenchidos!"});
        }

        const user=await User.findOne({ email:email}); //mudei de pesquisar o id para email para testar
        if (!user){
            return res.status(404).json({error:"Utilizador não foi encontrado!"});
        }
        // Se não tiver chave RSA guardada, guarda a que veio do frontend
        if (!user.chavePublicaRSA && req.body.chavePublicaRSA) {
            user.chavePublicaRSA = req.body.chavePublicaRSA;
            await user.save(); //Se a BD nao tem chave RSA, mas o browser enviou uma agora, guarda-a.
        }
        if (!user.chavePublicaRSA){
            return res.status(400).json({error:"Não foi registado a chave RSA!"});
        }

         // Verifica se a chave pública DH foi assinada pelo utilizador (prova de posse)
        const verificar= await assinaturaRSA(
            user.chavePublicaRSA,
            chavepub_remota,
            assinatura
        );

        if (!verificar.valida){
            return res.status(401).json({error: "Autenticação com a assinatura falhou!!"});
        }

        // Gera chaves DH no servidor e calcula a chave de sessão partilhada
        const chavesDH= await gerarchavesDH();
        const sessao= await calculoChaveSessao(chavepub_remota);


         // Cria um ID único para esta sessão de votação e guarda em memória
        const idSessao= crypto.randomBytes(16).toString("hex");

        sessoesVotar[idSessao]={
            email:user.email,
            chaveSessao:sessao.chave_sessao

        };
        // Devolve ao cliente o ID de sessão e a chave pública DH do servidor
        return res.json({
            id_sessao: idSessao,
            chave_publica_dh: PEMparabase64(chavesDH.chave_publica),
            chave_sessao: sessao.chave_sessao
        });

    }  catch (erro){
        console.error("Erro ao começar a votação, o erro foi:", erro);
        return res.status(500).json({error: "Houve um erro interno ao começar a votação!"})
    }
})

// Verifica se um utilizador tem permissão para votar numa eleição
// Permite acesso se não houver restrições, ou se o email/domínio estiver na lista
function utilizadorPodeVotar(eleicao, email) {
    const dominio = email.split("@")[1];

    const temEmails = eleicao.emailsPermitidos?.length > 0;
    const temDominios = eleicao.dominiosPermitidos?.length > 0;

    // se não há regras, pode entrar (desde que autentificado)
    if (!temEmails && !temDominios) return true;

    if (temEmails && eleicao.emailsPermitidos.includes(email)) return true;

    if (temDominios && eleicao.dominiosPermitidos.includes(dominio)) return true;

    return false;
}
// Recebe e regista um voto cifrado com AES-GCM
// Desencripta, valida e guarda o voto de forma anónima (sem ligar ao utilizador)
app.post("/api/votar", async(req,res)=>{

        if (!req.session || !req.session.user || !req.session.user.email){
            return res.status(401).json({error:"Utilizador não autenticado!!"});
        }


        try{
            const {id_sessao,votoCifrado,iv,tag,AAD,idEleicao}= req.body;
            if (!id_sessao || !votoCifrado || !iv || !tag || !AAD || !idEleicao){
                return res.status(400).json({error:"Dados incompletos ou não preenchidos!"});
            }

            const eleicao = await Eleicao.findById(idEleicao);
            if (!eleicao) {
                return res.status(404).json({ error: "Eleição não encontrada" });
            }

            const agora = new Date();

            if (agora < new Date(eleicao.data_inicio)) {
                return res.status(403).json({ error: "Esta eleição ainda não começou." });
            }

            if (agora > new Date(eleicao.data_fim)) {
                return res.status(403).json({ error: "Esta eleição já encerrou, não são permitidos mais votos" });
            }

            if (eleicao.tipo === "privada") {
                if (!req.session.acessoEleicaoPrivada ||
                    req.session.acessoEleicaoPrivada !== idEleicao) {
                    return res.status(401).json({ error: "Sem autorização para votar nesta eleição privada" });
                }
            }

            const email = req.session.user.email;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ error: "Utilizador não encontrado!" });
            }

            const sessao = sessoesVotar[id_sessao];

            if (!sessao) {
                return res.status(401).json({ error: "A sessão é inválida ou expirou!" });
            }


            const jaVotou = await EleicaoEleitor.findOne({
                id_eleicao: idEleicao,
                id_utilizador: user._id
            });

            if (jaVotou && jaVotou.votou) {
                delete sessoesVotar[id_sessao];
                return res.status(400).json({ error: "Já votou nesta eleição!" });
            }


            if (!utilizadorPodeVotar(eleicao, email)) {
                return res.status(403).json({
                    error: "Não tem permissão para votar nesta eleição"
                });
            }

            // Desencripta o voto usando a chave de sessão ECDH
            const desencriptado= await desencriptarVoto(
                sessao.chaveSessao,
                AAD || idEleicao,
                iv,
                votoCifrado,
                tag
            );

            const idOpcao= desencriptado.voto;

            // Guarda o voto de forma anónima (só o id da opção, sem referência ao utilizador)
            const guardarVoto= new Voto({
                id_eleicao: idEleicao,
                id_opcao: idOpcao
            });
            await guardarVoto.save();

            // Marca o utilizador como tendo votado nesta eleição (para evitar duplo voto)
            await EleicaoEleitor.findOneAndUpdate(
                { id_eleicao: idEleicao, id_utilizador: user._id },
                { votou: true },
                { upsert: true, new: true }
            );

            delete sessoesVotar[id_sessao]; // Remove a sessão de votação após voto registado
            return res.json({ message: "O voto foi corretamente registado!"});

        } catch(erro){
            console.error("Houve um erro ao votar, que foi:", erro);
            return res.status(500).json({error: "Houve um erro interno ao tentar registar o voto!"})
        }
    })

app.post("/verificar-eleicao-privada", eleicaoLimiter, async (req, res) => {
    try {
        const { idEleicao, senha, } = req.body;
        const email = req.session.user.email;

        console.log("VERIFICAR PRIVADA - código:", idEleicao); //para ver o que está mal
        console.log("VERIFICAR PRIVADA - email:", email);

        const eleicao = await Eleicao.findOne( { codigo: idEleicao });  //procura pelo codigo   
        if (!eleicao) {
            return res.status(404).json({ error: "Eleição não encontrada" });
        }
            //aqui tmb
        console.log("VERIFICAR PRIVADA - tipo:", eleicao.tipo);
        console.log("VERIFICAR PRIVADA - emailsPermitidos:", eleicao.emailsPermitidos);
        console.log("VERIFICAR PRIVADA - dominiosPermitidos:", eleicao.dominiosPermitidos);

        if (eleicao.tipo !== "privada") {
            return res.status(400).json({ error: "Esta eleição não é privada" });
        }

        //Verifica a senha da eleição privada junto do servidor CA (hash + salt)
        if (eleicao.passwordHash) {
            if (!senha) {
                return res.status(400).json({ error: "Senha em falta para esta eleição privada." });
            }

            const response = await fetch("http://servidor-ca:5000/verify-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: senha, salt: eleicao.salt, hash: eleicao.passwordHash })
            });

            const data = await response.json();
            if (!data.valid) {
                return res.status(401).json({ error: "Palavra-passe da votação incorreta." });
            }
        }

        // emails permitidos
        if (eleicao.emailsPermitidos && eleicao.emailsPermitidos.length > 0) {console.log("VERIFICAR - email do user:", email);
        console.log("VERIFICAR - emailsPermitidos:", eleicao.emailsPermitidos);
        console.log("VERIFICAR - email incluído?", eleicao.emailsPermitidos.includes(email));
            if (!eleicao.emailsPermitidos.includes(email)) {
                return res.status(403).json({ error: "O teu email não está na lista de eleitores autorizados." });
            }
        }

        // domínios permitidos
        if (eleicao.dominiosPermitidos && eleicao.dominiosPermitidos.length > 0) {
            const dominioEmail = email?.split("@")[1];  //dominio sem @
            console.log("VERIFICAR - domínio do user:", dominioEmail);
            console.log("VERIFICAR - dominiosPermitidos:", eleicao.dominiosPermitidos);
            console.log("VERIFICAR - domínio incluído?", eleicao.dominiosPermitidos.includes(dominioEmail));
            const dominioLimpo = dominioEmail.startsWith('@') ? dominioEmail : dominioEmail;
            const dominiosLimpos = eleicao.dominiosPermitidos.map(d => d.startsWith('@') ? d.substring(1) : d);
            if (!dominiosLimpos.includes(dominioLimpo)) {
                return res.status(403).json({ error: "O domínio do teu email não tem permissão para votar aqui." });
            }
        }

        // guarda sessão de autorização temporária, se passar em tudo
        
        req.session.acessoEleicaoPrivada = eleicao._id.toString();
        return res.json({ ok: true, message: "Acesso autorizado" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno" });
    }
});

// FAZER a parte que corre resultados de eleições
app.get("/eleicoes/:id/resultados", async(req,res)=>{


    if (!req.session || !req.session.user || !req.session.user.email){
        return res.status(401).json({error:"Utilizador não autenticado!"});
    }

    try{
        const id= req.params.id;
        const eleicao= await Eleicao.findById(id);

        if (!eleicao){
            return res.status(404).json({error:'Não encontrámos a eleição'});
        }
        
        const votos1=await Voto.find({id_eleicao: id});

        // Agrupa os votos por opção usando um objeto de contagem
        const votosTotal= {};
        votos1.forEach(total => {
            const idOpcaoStr = total.id_opcao.toString();
            votosTotal[idOpcaoStr] = (votosTotal[idOpcaoStr] || 0) + 1;
        });

        const votosTodos= votos1.length;
        // Calcula votos e percentagem para cada opção da eleição
        const resultados= eleicao.opcoes.map(opcao=>{
            const votoCandidato=votosTotal[opcao._id.toString()] || 0; //se não houver votos para a opção, considera 0. 
                                                                        //Faz-se desta forma para ser string, pois seria objeto se fosse votosTotal[opcoes.nome] sem o || 0, e depois não dava para fazer os cálculos.
            return{
                nome: opcao.nome,
                _id: opcao._id,
                votos: votoCandidato,
                percentagem: votosTodos>0
                    ? Number(votoCandidato / votosTodos * 100).toFixed(1) 
                    : 0
            };
        });
        res.json({
            nome: eleicao.nome,
            dataInicio: eleicao.data_inicio,
            dataFim: eleicao.data_fim,
            totalVotos: votosTodos, 
            resultados: resultados
        });
    } catch(erro3){
        res.status(500).json({erro3:"Erro ao buscar os reesultados da eleição!"})
    }
});


// Cria a password do utilizador, guarda o hash, salt, certificado e chave RSA pública
app.post("/create-password", async(req,res)=>{ //primeiro cria o utlizador (usando token e email) e depois cria a password:
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }   
 // Envia a password ao servidor CA para fazer hash seguro com salt
    const response = await fetch("http://servidor-ca:5000/hash-password", { //no porto 5000, pois é o porto onde o servidor CA está a correr, que tem as funções do ficheiro auth.py
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
    });

    // Solicita ao servidor CA a emissão de um certificado para o utilizador
    const certResponse = await fetch("http://servidor-ca:5000/sign", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    });
    
    const data = await response.json();

    const certData = await certResponse.json();
    console.log("chavePublicaRSA recebida:", req.body.chavePublicaRSA ? "sim" : "nao");

    // Guarda todos os dados de segurança do utilizador e marca como verificado
    user.chavePublicaRSA=req.body.chavePublicaRSA;
    user.certificate = certData.certificate; //guarda o certificado do utilizador na base de dados
    user.passwordHash = data.hash;
    user.salt = data.salt;
    user.isVerified = true;

    await user.save();

    return res.json({ message: "Password criada com sucesso" });
});



app.post("/verificar_password", loginLimiter, async(req,res)=>{
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ error: "Utilizador não encontrado" });
    }   
    // Verifica a password usando o hash e salt guardados na BD
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
   
    // Valida o certificado do utilizador junto do servidor de verificação
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

    // Cria a sessão autenticada com os dados do utilizador
    req.session.user = {
    email: user.email,
    isVerified: true,
    id: user._id.toString() //adiciono o toString para testar para ver se corre bem
    }

    return res.json({ message: "Autenticação bem-sucedida", subject: certData.subject });
});

// Devolve as opções de votação de uma eleição pelo seu ID
app.get("/eleicoes/:id/opcoes", async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.email){
        return res.status(401).json({error:"Utilizador não autenticado!!"});
    }
    try {
        const eleicao = await Eleicao.findById(req.params.id);


        if (!eleicao) {
            return res.status(404).json({ error: "Eleição não encontrada" });
        }

        res.json({
            nome: eleicao.nome,
            opcoes: eleicao.opcoes
        });

    } catch (erro) {
        res.status(500).json({ error: "Erro ao buscar opções" });
   }
});

// Cria uma nova eleição com as configurações fornecidas (pública ou privada)
app.post("/criar-eleicao", async(req,res)=>{

    try{
        if (!req.session || !req.session.user || !req.session.user.email){
            return res.status(401).json({error:"O utilizador não está autenticado!"});
        }
        const {     nome,
            candidatos,
            data_inicio,
            data_fim,
            privacidade, 
            descricao} = req.body;
        if (!nome || !candidatos || !data_inicio || !data_fim) {
            return res.status(400).json({ error: "Dados incompletos ou não preenchidos!" });
        }

        // Gera um código único para a eleição (evita colisões com loop de verificação)
        let codigo;
        let codigoExiste = true;    

        while (codigoExiste) {
            codigo = gerarCodigoEleicao();
            const eleicaoExistente = await Eleicao.findOne({ codigo });
            if (!eleicaoExistente) {
                codigoExiste = false;
            }
        }
        const tipo = privacidade?.tipo || "publica";
        const emailsPermitidos = privacidade?.emails || [];
        const dominiosPermitidos = privacidade?.dominios || [];
        const password = privacidade?.senha || null;

        let passwordHash = null;
        let salt = null;

        // Eleições privadas sem senha são rejeitadas
        if (tipo === "privada" && !password) {
            return res.status(400).json({error: "Eleições privadas precisam de senha"})}
        if (tipo === "privada" && password) {

            const response = await fetch("http://servidor-ca:5000/hash-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            passwordHash = data.hash;
            salt = data.salt;
        } 
        const novaEleicao = new Eleicao({
            codigo,
            nome,
            descricao: descricao || null ,
            tipo,
            emailsPermitidos,
            dominiosPermitidos,
            passwordHash,
            salt,
            id_criador: req.session.user.id,    
            data_inicio: new Date(data_inicio),//aqui e no index, como mandávamos date local, mas o mongoDB, tornava a data para UTC
            data_fim: new Date(data_fim),// vamos converter para UTC antes de enviar, para 1hora de atraso antes de começar
            opcoes: candidatos.map(candidato => ({ nome: candidato }))
        });


        await novaEleicao.save();
        return res.json({ message: "Eleição criada com sucesso", codigo });
    } catch (error) {
        console.error("Erro ao criar a eleição:", error);
        return res.status(500).json({ error: "Houve um erro interno ao criar a eleição!" });

    }
});

// Procura uma eleição pelo código e verifica se já começou antes de devolver os dados
app.get("/eleicoes/codigo/:codigo", async (req, res) => { //get, pois só queremos obter os dados da eleição, e não criar ou modificar nada


    
    if (!req.session || !req.session.user || !req.session.user.email){
        return res.status(401).json({error:"Utilizador não autenticado!!"});
    }
    const { codigo } = req.params;

    const eleicao = await Eleicao.findOne({ codigo });

    if (!eleicao) {
        return res.status(404).json({
            error: "Eleição não encontrada"
        });
    }
    const agora = new Date();

  // Impede acesso a eleições que ainda não começaram
    if (agora < new Date(eleicao.data_inicio)) {
        return res.status(403).json({
            error: "A eleição ainda não começou",
            data_inicio: eleicao.data_inicio
        });
    }

// Devolve apenas os campos necessários
    return res.json({
        _id: eleicao._id,
        codigo: eleicao.codigo,
        nome: eleicao.nome,
        descricao: eleicao.descricao,
        tipo: eleicao.tipo,
        data_inicio: eleicao.data_inicio,
        data_fim: eleicao.data_fim,
        opcoes: eleicao.opcoes
    }); //isto, para não devolver para o front end o a palavra passe nem salt
});

// Devolve todas as eleições criadas pelo utilizador autenticado    
app.get("/eleicoes", async (req, res) => {

    if (!req.session || !req.session.user || !req.session.user.email){
        return res.status(401).json({error:"Utilizador não autenticado!!"});
    }
    
    try { 
        const user = req.session.user.id;
        const eleicoes = await Eleicao.find( {id_criador: user});
        return res.json(eleicoes);
    } catch (error) {
        console.error("Erro ao criar a eleição:", error);
        return res.status(500).json({ error: "Houve um erro interno ao criar a eleição!" });
    }});


// Guarda ou atualiza a chave pública RSA do utilizador autenticado na BD
app.post("/guardar-chave-rsa",async (req,res)=>{


    try{
        const {chavePublicaRSA}=req.body; // tmb tirei aqui o email, pq pode não coincidir com o email de sessao

        if (!req.session || !req.session.user || !req.session.user.email){
            return res.status(401).json({error: "User não foi autenticado!!"});
        }

        const email= req.session.user.email;
        const user= await User.findOne({email});
        if (!user){
            return res.status(404).json({error:"User not found!!"});
        }

        user.chavePublicaRSA=chavePublicaRSA;
        await user.save();

        return res.json({message:"A chave RSA foi guardada!!"});
    } catch(erro){
        console.error("Houve um erro ao guardar a chave RSA:", erro);
        return res.status(500).json({error:"Houve um erro interno"});
    }
});

// Devolve informação da sessão ativa — usado pelo frontend para verificar autenticação
app.get ("/api/sessao-info", (req,res)=>{


        if (req.session && req.session.user && req.session.user.email) {
            return res.json({
            sessao_ativa: true,
            email: req.session.user.email,
            id: req.session.user.id
        });
    }
    else {
        return res.status(401).json({error:"Utilizador não autenticado!!"});
    }
});
//arrancar server

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});

// Devolve todas as eleições públicas, com suporte a pesquisa por nome
app.get("/eleicoes-publicas", async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.email) {
        return res.status(401).json({ error: "Utilizador não autenticado!!" });
    }

    try {
        const { q } = req.query;
        let  filtro = { tipo: "publica" };

        if (q) {
            filtro.nome = { $regex: q, $options: "i" }; }

        const eleicoes = await Eleicao.find(filtro);
        return res.json(eleicoes);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao buscar eleições públicas." });
    }
});