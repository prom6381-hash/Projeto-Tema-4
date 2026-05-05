const mongoose = require("mongoose");
 

// Guarda apenas o voto em si — sem qualquer referência ao utilizador
// Não é possível ligar este documento a quem voto
const votoSchema = new mongoose.Schema(
  {
    id_eleicao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eleicao",
      required: true,
    },
 
    id_opcao: {
      type: mongoose.Schema.Types.ObjectId, // referência ao _id da opção dentro da eleição
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
 
module.exports = mongoose.model("Voto", votoSchema);