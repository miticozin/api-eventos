const express = require("express");
const prisma = require("../prisma");
const { texto, erroInterno } = require("../utils");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { eventos: true } } },
    });
    return res.status(200).json(categorias);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { eventos: true } } },
    });

    if (!categoria) {
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    return res.status(200).json(categoria);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.post("/", async (req, res) => {
  try {
    const corpo = req.body ?? {};
    const nome = texto(corpo.nome);

    if (!nome) {
      return res.status(400).json({ erro: "O campo nome é obrigatório." });
    }

    const categoria = await prisma.categoria.create({
      data: { nome, descricao: texto(corpo.descricao), userId: req.userId },
    });

    return res.status(201).json(categoria);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const categoria = await prisma.categoria.findUnique({ where: { id: req.params.id } });

    if (!categoria) {
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    if (categoria.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para alterar esta categoria." });
    }

    const corpo = req.body ?? {};
    const nome = texto(corpo.nome);

    if (!nome) {
      return res.status(400).json({ erro: "O campo nome é obrigatório." });
    }

    const atualizada = await prisma.categoria.update({
      where: { id: categoria.id },
      data: { nome, descricao: texto(corpo.descricao) },
    });

    return res.status(200).json(atualizada);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const categoria = await prisma.categoria.findUnique({ where: { id: req.params.id } });

    if (!categoria) {
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    if (categoria.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para remover esta categoria." });
    }

    const totalEventos = await prisma.evento.count({ where: { categoriaId: categoria.id } });

    if (totalEventos > 0) {
      return res.status(409).json({ erro: "Não é possível remover uma categoria que possui eventos." });
    }

    await prisma.categoria.delete({ where: { id: categoria.id } });

    return res.status(200).json({ mensagem: "Categoria removida com sucesso." });
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

module.exports = router;
