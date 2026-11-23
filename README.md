# API de Eventos (DWEB 1)

Backend REST com Node.js, Express, Prisma 7.10.0 (adaptador Neon), PostgreSQL, JWT e bcrypt.

Autor: Vítor Gomes

## Modelo de dados

- `users`: usuários do sistema (senha salva com hash bcrypt)
- `categorias`: categorias dos eventos (1:N com `eventos`)
- `eventos`: eventos com local, data e vagas
- `participantes`: pessoas que podem se inscrever
- `inscricoes`: tabela associativa do N:N entre `eventos` e `participantes`, com `dataInscricao` e `status`

`users` se relaciona 1:N com `categorias`, `eventos` e `participantes`.

## Como rodar

1. `npm install`
2. Crie um banco gratuito no Neon e copie a connection string.
3. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `JWT_SECRET` e `PORT`.
4. `npx prisma migrate dev`
5. `npx prisma generate`
6. `npm run dev` (ou `npm start`)

A API sobe em `http://localhost:3000`.

## Rotas

Públicas:

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cadastra usuário (`username`, `email`, `password`) |
| POST | `/auth/login` | Retorna o token JWT (`email`, `password`) |

Protegidas (cabeçalho `Authorization: Bearer <token>`):

| Método | Rota | Descrição |
|---|---|---|
| GET | `/auth/me` | Dados do usuário logado |
| GET, POST | `/categorias` | Lista e cria categorias |
| GET, PUT, DELETE | `/categorias/:id` | Busca, atualiza e remove |
| GET, POST | `/eventos` | Lista e cria eventos |
| GET, PUT, DELETE | `/eventos/:id` | Busca, atualiza e remove |
| GET, POST | `/participantes` | Lista e cria participantes |
| GET, PUT, DELETE | `/participantes/:id` | Busca, atualiza e remove |
| POST | `/eventos/:id/participantes/:idParticipante` | Inscreve o participante no evento (corpo opcional: `status`) |
| GET | `/eventos/:id/participantes` | Participantes inscritos no evento |
| GET | `/participantes/:id/eventos` | Eventos em que o participante está inscrito |
| DELETE | `/eventos/:id/participantes/:idParticipante` | Remove a inscrição |

## Regras

- Qualquer usuário logado lista e consulta os registros; só o dono altera ou remove (403 para os demais).
- Não é possível remover uma categoria que tenha eventos (409).
- Inscrição repetida ou evento sem vagas retorna 409.
- Status válidos da inscrição: `CONFIRMADA`, `PENDENTE`, `CANCELADA`.
- O campo `password` nunca é devolvido nas respostas.
- Login inválido retorna sempre a mesma mensagem, sem revelar se errou o e-mail ou a senha.

## Exemplos de corpo

Evento (`POST /eventos`):

```json
{
  "titulo": "Semana Academica",
  "descricao": "Palestras e Projetos",
  "local": "Auditório central",
  "data": "2026-12-15T19:00:00Z",
  "vagas": 50,
  "categoriaId": "<id da categoria>"
}
```

Participante (`POST /participantes`):

```json
{ "nome": "Vitor Gomes", "email": "emailgenerico@email.com", "telefone": "53999999999" }
```
