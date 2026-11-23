const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor) {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : null;
}

function emailValido(valor) {
  return typeof valor === "string" && EMAIL_REGEX.test(valor.trim());
}

function erroInterno(res, erro) {
  console.error(erro);
  if (erro && erro.code === "P2002") {
    return res.status(409).json({ erro: "Já existe um registro com esses dados." });
  }
  return res.status(500).json({ erro: "Erro interno do servidor." });
}

module.exports = { texto, emailValido, erroInterno };
