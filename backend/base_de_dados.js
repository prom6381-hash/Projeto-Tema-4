const mongoose = require("mongoose");

const MONGO_URI = "mongodb://mongo:27017/votoseguro";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB ligado com sucesso");
  } catch (error) {
    console.error("Erro ao ligar MongoDB:", error);
    process.exit(1);
  }
};

connectDB();