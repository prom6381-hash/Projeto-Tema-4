const mongoose = require("mongoose");

// URI de ligação à base de dados MongoDB
const MONGO_URI = "mongodb://mongo:27017/votoseguro";

// Estabelece a ligação à base de dados MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI); // Tenta ligar à base de dados
    console.log("MongoDB ligado com sucesso");
  } catch (error) {
    console.error("Erro ao ligar MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;