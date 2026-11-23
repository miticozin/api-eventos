const express = require("express");
const prisma = require("../prisma");
const { texto, emailValido, erroInterno } = require("../utils");

const router = express.Router();

function validar(corpo) {
  const nome = texto(corpo.nome);
  const email = emailValido(corpo.email) ? corpo.email.trim().toLowerCase() : null;

  if (!nome || !email) {
    return { erro: "Informe nome e um e-mail válido." };
  }

  return { dados: { nome, email, telefone: texto(corpo.telefone) } };
}

router.get("/", async (req, res) => {
  try {
    const participantes = await prisma.participante.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { inscricoes: true } } },
    });
    return res.status(200).json(participantes);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/:id/eventos", async (req, res) => {
  try {
    const participante = await prisma.participante.findUnique({ where: { id: req.params.id } });

    if (!participante) {
      return res.status(404).json({ erro: "Participante não encontrado." });
    }

    const inscricoes = await prisma.inscricao.findMany({
      where: { participanteId: participante.id },
      include: { evento: { include: { categoria: true } } },
      orderBy: { dataInscricao: "asc" },
    });

    const eventos = inscricoes.map((i) => ({
      ...i.evento,
      inscricao: { dataInscricao: i.dataInscricao, status: i.status },
    }));

    return res.status(200).json(eventos);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const participante = await prisma.participante.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { inscricoes: true } } },
    });

    if (!participante) {
      return res.status(404).json({ erro: "Participante não encontrado." });
    }

    return res.status(200).json(participante);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.post("/", async (req, res) => {
  try {
    const { erro, dados } = validar(req.body ?? {});

    if (erro) {
      return res.status(400).json({ erro });
    }

    const existente = await prisma.participante.findUnique({ where: { email: dados.email } });

    if (existente) {
      return res.status(409).json({ erro: "Já existe um participante com este e-mail." });
    }

    const participante = await prisma.participante.create({
      data: { ...dados, userId: req.userId },
    });

    return res.status(201).json(participante);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const participante = await prisma.participante.findUnique({ where: { id: req.params.id } });

    if (!participante) {
      return res.status(404).json({ erro: "Participante não encontrado." });
    }

    if (participante.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para alterar este participante." });
    }

    const { erro, dados } = validar(req.body ?? {});

    if (erro) {
      return res.status(400).json({ erro });
    }

    const outro = await prisma.participante.findUnique({ where: { email: dados.email } });

    if (outro && outro.id !== participante.id) {
      return res.status(409).json({ erro: "Já existe um participante com este e-mail." });
    }

    const atualizado = await prisma.participante.update({
      where: { id: participante.id },
      data: dados,
    });

    return res.status(200).json(atualizado);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const participante = await prisma.participante.findUnique({ where: { id: req.params.id } });

    if (!participante) {
      return res.status(404).json({ erro: "Participante não encontrado." });
    }

    if (participante.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para remover este participante." });
    }

    await prisma.participante.delete({ where: { id: participante.id } });

    return res.status(200).json({ mensagem: "Participante removido com sucesso." });
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

module.exports = router;
