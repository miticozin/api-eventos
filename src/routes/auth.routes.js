const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const auth = require("../middlewares/auth");
const { texto, emailValido, erroInterno } = require("../utils");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const corpo = req.body ?? {};
    const username = texto(corpo.username);
    const email = emailValido(corpo.email) ? corpo.email.trim().toLowerCase() : null;
    const password = typeof corpo.password === "string" ? corpo.password : "";

    if (!username || !email || password.length < 6) {
      return res.status(400).json({
        erro: "Informe username, um e-mail válido e uma senha com no mínimo 6 caracteres.",
      });
    }

    const existente = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existente) {
      return res.status(409).json({ erro: "E-mail ou username já cadastrado." });
    }

    const hash = await bcrypt.hash(password, 10);

    const usuario = await prisma.user.create({
      data: { username, email, password: hash },
      select: { id: true, username: true, email: true },
    });

    return res.status(201).json(usuario);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.post("/login", async (req, res) => {
  try {
    const corpo = req.body ?? {};
    const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
    const password = typeof corpo.password === "string" ? corpo.password : "";

    if (!email || !password) {
      return res.status(400).json({ erro: "Informe e-mail e senha." });
    }

    const usuario = await prisma.user.findUnique({ where: { email } });
    const senhaCorreta = usuario ? await bcrypt.compare(password, usuario.password) : false;

    if (!usuario || !senhaCorreta) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return res.status(200).json({
      token,
      user: { id: usuario.id, username: usuario.username, email: usuario.email },
    });
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true },
    });

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário do token não existe mais." });
    }

    return res.status(200).json(usuario);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

module.exports = router;
