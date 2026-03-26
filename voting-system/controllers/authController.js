const User = require("../models/User");

const register = async (req, res) => {
  try {
    const { name, certificate } = req.body;

    if (!name || !certificate) {
      return res.status(400).json({ message: "Dados em falta" });
    }

    // ver se já existe
    const existingUser = await User.findOne({ certificate });

    if (existingUser) {
      return res.status(400).json({ message: "Utilizador já existe" });
    }

    const user = new User({
      name,
      certificate
    });

    await user.save();

    res.json({ message: "Registado com sucesso", user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

module.exports = { register };