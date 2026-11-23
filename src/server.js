require("dotenv").config();
const express = require("express");
const cors = require("cors");
const auth = require("./middlewares/auth");
const authRoutes = require("./routes/auth.routes");
const categoriasRoutes = require("./routes/categorias.routes");
const eventosRoutes = require("./routes/eventos.routes");
const participantesRoutes = require("./routes/participantes.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ mensagem: "API de Eventos no ar." });
});

app.use("/auth", authRoutes);
app.use("/categorias", auth, categoriasRoutes);
app.use("/eventos", auth, eventosRoutes);
app.use("/participantes", auth, participantesRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
  if (erro && erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
  }
  console.error(erro);
  return res.status(500).json({ erro: "Erro interno do servidor." });
});

if (require.main === module) {
  if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
    console.error("Defina DATABASE_URL e JWT_SECRET no arquivo .env.");
    process.exit(1);
  }

  const porta = process.env.PORT || 3000;
  app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
  });
}

module.exports = app;
