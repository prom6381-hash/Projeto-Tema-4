const mongoose = require("mongoose");

const eleicaoSchema  = new mongoose.Schema (
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    tipo: {
      type: String,
      enum: ["publica", "privada"],
      default: "publica"
    },
    
    emailsPermitidos: [String],

    passwordHash: String,
    saltPassword: String,
    dominiosPermitidos: [String],

    nome: {
      type: String,
      required: true,
      trim: true,
    },
 
    id_criador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilizador",
      required: true,
    },
 
    data_inicio: {
      type: Date,
      required: true,
    },
 
    data_fim: {
      type: Date,
      required: true,
    },
 
    estado: {
      type: String,
      enum: ["pendente", "ativa", "encerrada"],
      default: "pendente",
    },
 
    opcoes: [
      {
        // cada opção é um objeto com um nome
        // ex: [{ nome: "Candidato A" }, { nome: "Candidato B" }]
        nome: {
          type: String,
          required: true,
          trim: true},
      },
    ],
  },
  {
    timestamps: true,
  }
);
 
module.exports = mongoose.model("Eleicao", eleicaoSchema);
