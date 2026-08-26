# FinanceFlow

Aplicação de controle financeiro pessoal multiusuário: cada pessoa cria sua conta e gerencia seus próprios lançamentos (receitas e despesas), categorização, resumo mensal e gráfico de despesas por categoria. As categorias são compartilhadas entre todos os usuários; os lançamentos são privados de cada conta.

Monorepo simples com duas partes:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (raiz do projeto)
- **Backend**: Node.js + Express + TypeScript + Prisma, com PostgreSQL (pasta [server/](server/))

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+ (testado com Node 24)
- [Docker](https://www.docker.com/) e Docker Compose (para o banco PostgreSQL)

## Estrutura do projeto

```
FinanceFlow/
├── docker-compose.yml   # banco PostgreSQL para desenvolvimento
├── src/                 # frontend React
├── server/               # backend Express + Prisma
│   ├── prisma/           # schema, migrations e seed
│   └── src/
└── package.json          # scripts do frontend
```

## Configuração inicial

### 1. Clonar e instalar dependências

Instale as dependências do frontend (raiz) e do backend (`server/`) separadamente:

```bash
npm install
npm --prefix server install
```

### 2. Subir o banco de dados

O `docker-compose.yml` na raiz sobe um PostgreSQL já configurado para o backend:

```bash
docker compose up -d
```

Isso cria o container `financeflow-db`, com o banco `financeflow` acessível em `localhost:5432` (usuário/senha `financeflow`/`financeflow`).

### 3. Configurar variáveis de ambiente do backend

Copie o arquivo de exemplo e ajuste se necessário (os valores padrão já batem com o `docker-compose.yml`):

```bash
cd server
cp .env.example .env
```

`server/.env`:

```env
DATABASE_URL="postgresql://financeflow:financeflow@localhost:5432/financeflow?schema=public"
PORT=3333
CORS_ORIGIN="http://localhost:5173"
SESSION_SECRET="replace-with-a-long-random-string"
```

`SESSION_SECRET` assina o cookie de sessão (login por e-mail/senha). Em produção, use um valor aleatório forte (ex.: `openssl rand -hex 32`) e defina `NODE_ENV=production` para que o cookie de sessão exija HTTPS (`secure: true`).

### 4. Rodar as migrations e popular o banco

Ainda dentro de `server/`:

```bash
npm run prisma:migrate
npm run db:seed
```

- `prisma:migrate` aplica as migrations do Prisma (cria as tabelas `usuarios`, `categorias` e `lancamentos`).
- `db:seed` executa [prisma/seed.ts](server/prisma/seed.ts), populando a tabela de categorias com um conjunto inicial (Salário, Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Investimentos, Outros, Compra de Casa).

A sessão de login usa a tabela `session`, criada automaticamente pelo `connect-pg-simple` na primeira execução do backend (não faz parte das migrations do Prisma).

Volte para a raiz do projeto depois desse passo:

```bash
cd ..
```

## Rodando o projeto

### Opção A: frontend e backend juntos

Na raiz do projeto:

```bash
npm run dev:all
```

Isso sobe o Vite (frontend, porta `5173`) e o backend (`server`, porta `3333`) em paralelo.

### Opção B: separadamente

Em um terminal, o backend:

```bash
npm --prefix server run dev
```

Em outro terminal, o frontend:

```bash
npm run dev
```

Acesse a aplicação em **http://localhost:5173**. O Vite já está configurado (em [vite.config.ts](vite.config.ts)) para fazer proxy de `/api` para `http://localhost:3333`, então o frontend consegue chamar a API sem configuração extra de CORS em dev.

## Scripts disponíveis

### Frontend (raiz)

| Script | Descrição |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite |
| `npm run dev:all` | Sobe frontend e backend juntos (via `concurrently`) |
| `npm run build` | Type-check (`tsc -b`) e build de produção |
| `npm run preview` | Serve o build de produção localmente |

### Backend (`server/`)

| Script | Descrição |
| --- | --- |
| `npm run dev` | Sobe a API em modo watch (`tsx watch`) |
| `npm run build` | Compila o TypeScript (`tsc`) |
| `npm start` | Roda a API compilada (`dist/index.js`) |
| `npm run prisma:migrate` | Aplica migrations do Prisma (`prisma migrate dev`) |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI para o banco) |
| `npm run db:seed` | Popula o banco com as categorias iniciais |

## API

A API expõe as rotas abaixo sob o prefixo `/api` (ver [server/src/routes](server/src/routes)). Autenticação é feita por sessão em cookie httpOnly (não por token no header) — o cliente precisa enviar o cookie em cada requisição (`credentials: 'include'` no fetch). Todas as rotas de categorias e lançamentos exigem login; sem sessão válida, respondem `401`.

### Autenticação (`/api/auth`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/auth/registrar` | Cria uma conta (`{ email, senha, nome? }`, senha mínima de 8 caracteres) e já inicia a sessão |
| `POST` | `/api/auth/login` | Autentica (`{ email, senha }`) e inicia a sessão |
| `POST` | `/api/auth/logout` | Encerra a sessão atual |
| `GET` | `/api/auth/me` | Retorna o usuário autenticado (usado para restaurar a sessão ao recarregar a página) — requer login |

### Categorias (`/api/categorias`) — requer login, compartilhadas entre usuários

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/categorias` | Lista todas as categorias |
| `POST` | `/api/categorias` | Cria uma categoria (`{ nome }`) |
| `PUT` | `/api/categorias/:id` | Atualiza uma categoria (`{ nome }`) |
| `DELETE` | `/api/categorias/:id` | Remove uma categoria |

### Lançamentos (`/api/lancamentos`) — requer login, privados por usuário

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/lancamentos?mes=YYYY-MM&busca=&tipo=&ordem=` | Lista lançamentos do mês do usuário logado, com filtros opcionais de busca, tipo (`receita`/`despesa`) e ordem (`asc`/`desc`) |
| `GET` | `/api/lancamentos/resumo?mes=YYYY-MM` | Retorna receitas, despesas e saldo do mês do usuário logado |
| `GET` | `/api/lancamentos/por-categoria?mes=YYYY-MM` | Retorna totais de despesas do usuário logado, agrupados por categoria |
| `POST` | `/api/lancamentos` | Cria um lançamento (`{ descricao, valor, tipo, data, categoriaId }`) para o usuário logado |
| `PUT` | `/api/lancamentos/:id` | Atualiza um lançamento (só o dono pode editar; de outro usuário retorna `404`) |
| `DELETE` | `/api/lancamentos/:id` | Remove um lançamento (só o dono pode excluir; de outro usuário retorna `404`) |

## Banco de dados

O schema do Prisma ([server/prisma/schema.prisma](server/prisma/schema.prisma)) define três modelos principais:

- **Usuario**: `id`, `email` (único), `senhaHash`, `nome` (opcional)
- **Categoria**: `id`, `nome` (único, compartilhada entre usuários)
- **Lancamento**: `id`, `descricao`, `valor`, `tipo` (`receita`/`despesa`), `data`, `categoriaId`, `usuarioId` (dono do lançamento)

Para inspecionar os dados visualmente, use o Prisma Studio:

```bash
npm --prefix server run prisma:studio
```

## Solução de problemas

- **Erro de conexão com o banco**: confirme que o container está rodando com `docker compose ps` e que `DATABASE_URL` em `server/.env` bate com as credenciais do `docker-compose.yml`.
- **Porta 5432 já em uso**: pare qualquer outro PostgreSQL local rodando na máquina ou ajuste a porta no `docker-compose.yml` e em `DATABASE_URL`.
- **Frontend não consegue falar com a API**: verifique se o backend está rodando na porta `3333` e se o proxy do Vite (`vite.config.ts`) aponta para o mesmo endereço.
- **Login funciona mas a sessão não persiste (sempre pede login de novo)**: confirme que `SESSION_SECRET` está definido em `server/.env` e que o frontend está rodando via `npm run dev`/proxy do Vite (não abrindo o backend direto em outra origem), já que o cookie de sessão depende de `credentials: 'include'` e de `CORS_ORIGIN` apontar exatamente para a origem do frontend.
- **`401 Não autenticado` em todas as chamadas**: normal se não houver sessão ativa — faça login pela tela inicial da aplicação antes de chamar `/api/categorias` ou `/api/lancamentos` diretamente.
