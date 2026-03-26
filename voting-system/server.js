const express = require("express");
const connectDB = require("./config/db");

const app = express();

// Conecta ao MongoDB
connectDB();

// Middleware para ler JSON do body
app.use(express.json());

// Rotas
app.use("/api/auth", require("./routes/auth"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));