const mongoose = require("mongoose");


// Controla quem pode votar em cada eleição e se já votou
// Não guarda em que opção votou — só se votou ou não
const eleicaoEleitorSchema = new mongoose.Schema(
  {
    id_eleicao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eleicao",
      required: true,
    },

    id_utilizador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilizador",
      required: true,
    },

    votou: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índice que impede o mesmo utilizador de ser adicionado
// duas vezes à mesma eleição
eleicaoEleitorSchema.index(
  { id_eleicao: 1, id_utilizador: 1 },
  { unique: true }
);

module.exports = mongoose.model("EleicaoEleitor", eleicaoEleitorSchema);