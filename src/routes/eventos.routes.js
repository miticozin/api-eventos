const express = require("express");
const prisma = require("../prisma");
const { texto, erroInterno } = require("../utils");

const router = express.Router();

const STATUS_VALIDOS = ["CONFIRMADA", "PENDENTE", "CANCELADA"];

function validar(corpo) {
  const titulo = texto(corpo.titulo);
  const local = texto(corpo.local);
  const data = new Date(corpo.data);
  const vagas = corpo.vagas;
  const categoriaId = texto(corpo.categoriaId);

  if (!titulo || !local || !categoriaId) {
    return { erro: "Informe titulo, local e categoriaId." };
  }

  if (!corpo.data || Number.isNaN(data.getTime())) {
    return { erro: "Informe uma data válida (ex.: 2026-12-15T19:00:00Z)." };
  }

  if (!Number.isInteger(vagas) || vagas < 1) {
    return { erro: "O campo vagas deve ser um número inteiro maior que zero." };
  }

  return { dados: { titulo, descricao: texto(corpo.descricao), local, data, vagas, categoriaId } };
}

router.get("/", async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: { data: "asc" },
      include: { categoria: true, _count: { select: { inscricoes: true } } },
    });
    return res.status(200).json(eventos);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/:id/participantes", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    const inscricoes = await prisma.inscricao.findMany({
      where: { eventoId: evento.id },
      include: { participante: true },
      orderBy: { dataInscricao: "asc" },
    });

    const participantes = inscricoes.map((i) => ({
      ...i.participante,
      inscricao: { dataInscricao: i.dataInscricao, status: i.status },
    }));

    return res.status(200).json(participantes);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.post("/:id/participantes/:idParticipante", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para gerenciar as inscrições deste evento." });
    }

    const participante = await prisma.participante.findUnique({
      where: { id: req.params.idParticipante },
    });

    if (!participante) {
      return res.status(404).json({ erro: "Participante não encontrado." });
    }

    const corpo = req.body ?? {};
    const status = corpo.status === undefined ? "CONFIRMADA" : corpo.status;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(", ")}.` });
    }

    const chave = { eventoId_participanteId: { eventoId: evento.id, participanteId: participante.id } };
    const existente = await prisma.inscricao.findUnique({ where: chave });

    if (existente) {
      return res.status(409).json({ erro: "Este participante já está inscrito neste evento." });
    }

    const totalInscritos = await prisma.inscricao.count({ where: { eventoId: evento.id } });

    if (totalInscritos >= evento.vagas) {
      return res.status(409).json({ erro: "O evento não possui mais vagas." });
    }

    const inscricao = await prisma.inscricao.create({
      data: { eventoId: evento.id, participanteId: participante.id, status },
    });

    return res.status(201).json(inscricao);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.delete("/:id/participantes/:idParticipante", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para gerenciar as inscrições deste evento." });
    }

    const chave = {
      eventoId_participanteId: { eventoId: evento.id, participanteId: req.params.idParticipante },
    };
    const inscricao = await prisma.inscricao.findUnique({ where: chave });

    if (!inscricao) {
      return res.status(404).json({ erro: "Inscrição não encontrada." });
    }

    await prisma.inscricao.delete({ where: chave });

    return res.status(200).json({ mensagem: "Inscrição removida com sucesso." });
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({
      where: { id: req.params.id },
      include: { categoria: true, _count: { select: { inscricoes: true } } },
    });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    return res.status(200).json(evento);
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

    const categoria = await prisma.categoria.findUnique({ where: { id: dados.categoriaId } });

    if (!categoria) {
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    const evento = await prisma.evento.create({
      data: { ...dados, userId: req.userId },
      include: { categoria: true },
    });

    return res.status(201).json(evento);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para alterar este evento." });
    }

    const { erro, dados } = validar(req.body ?? {});

    if (erro) {
      return res.status(400).json({ erro });
    }

    const categoria = await prisma.categoria.findUnique({ where: { id: dados.categoriaId } });

    if (!categoria) {
      return res.status(404).json({ erro: "Categoria não encontrada." });
    }

    const totalInscritos = await prisma.inscricao.count({ where: { eventoId: evento.id } });

    if (dados.vagas < totalInscritos) {
      return res.status(409).json({ erro: "O número de vagas não pode ser menor que o de inscritos." });
    }

    const atualizado = await prisma.evento.update({
      where: { id: evento.id },
      data: dados,
      include: { categoria: true },
    });

    return res.status(200).json(atualizado);
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const evento = await prisma.evento.findUnique({ where: { id: req.params.id } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.userId !== req.userId) {
      return res.status(403).json({ erro: "Você não tem permissão para remover este evento." });
    }

    await prisma.evento.delete({ where: { id: evento.id } });

    return res.status(200).json({ mensagem: "Evento removido com sucesso." });
  } catch (erro) {
    return erroInterno(res, erro);
  }
});

module.exports = router;
