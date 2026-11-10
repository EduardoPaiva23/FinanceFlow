# FinanceFlow

Aplicação de controle financeiro pessoal multiusuário: cada pessoa cria sua conta e gerencia seus próprios lançamentos (receitas e despesas), categorização, resumo mensal e gráfico de despesas por categoria. As categorias são compartilhadas entre todos os usuários; os lançamentos são privados de cada conta.

## Funcionalidades

- **Contas e login** por e-mail e senha, com sessão em cookie.
- **Lançamentos** de receita e despesa, com categoria, busca, filtro por tipo e ordenação.
- **Painel mensal**: saldo, receitas, despesas e gráfico de despesas por categoria.
- **Importação de fatura de cartão** em OFX ou PDF: o arquivo é lido, os lançamentos aparecem em um modal de revisão e você adiciona um a um ("+") ou todos de uma vez.
- **Lançamentos parcelados**: detectados na fatura ("03/10", "Parcela 3 de 10") ou cadastrados à mão; as parcelas futuras são criadas nos meses seguintes.
- **Prevenção de duplicidade**: ao importar a fatura do mês seguinte, o que já está cadastrado é reconhecido e não é repetido.

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
│   ├── src/
│   │   ├── importacao/   # leitura de OFX/PDF e classificação de duplicidade
│   │   ├── lib/          # regras de parcelas e normalização
│   │   ├── routes/ services/ schemas/ middleware/
│   └── tests/            # testes unitários (vitest)
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

Ao atualizar um projeto já configurado (por exemplo, depois de baixar uma versão com migrations novas), basta aplicar as pendentes:

```bash
npx prisma migrate deploy
```

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

## Importação de fatura e parcelados

Na tela de lançamentos, **Importar via arquivo** aceita a fatura do cartão em `.ofx` ou `.pdf` (até 10 MB, um arquivo por vez). O arquivo é apenas lido: nada é gravado até você adicionar no modal, e nem o arquivo nem a senha do PDF ficam armazenados.

Cada lançamento identificado aparece em um destes estados:

| Estado | Significado |
| --- | --- |
| Novo | Não existe lançamento correspondente; pode ser adicionado e entra em "Adicionar todos" |
| Possível duplicidade | Existe um lançamento com mesma data e valor mas descrição diferente; só é adicionado pelo "+" da linha |
| Já cadastrado | Já existe; não pode ser adicionado de novo |

Regras principais:

- **Categoria** é obrigatória. Ela vem sugerida pelo último lançamento com a mesma descrição e pode ser aplicada em lote às linhas sem categoria.
- **Parcelas**: ao adicionar a parcela X de N, são criadas também as parcelas X+1 até N, uma por mês, no mesmo dia (ou no último dia do mês, quando o dia não existe). As parcelas anteriores a X não são criadas. Dá para marcar ou desmarcar "Parcelado" em cada linha antes de adicionar.
- **Duplicidade**: OFX é comparado pelo identificador da transação (FITID); parcelas, por descrição + número + total + valor; os demais, por data + valor + descrição. Um lançamento importado continua sendo reconhecido mesmo depois de editado. Um lançamento excluído volta como novo se o arquivo for reimportado.
- **Linhas que não viram lançamento**: pagamento da fatura anterior, saldo, total e limite. Estornos e créditos entram como receita.

No formulário **Novo lançamento**, a opção **Parcelado** cria de 2 a 48 parcelas a partir do valor total ou do valor da parcela. Ao editar ou excluir uma parcela, você escolhe aplicar em "Somente esta", "Esta e as próximas" ou "Todas".

**Limitação do PDF:** o leitor é genérico (procura linhas no formato data + descrição + valor) e não conhece o layout de cada banco. Funciona apenas em PDF com texto selecionável, não em PDF escaneado, e ainda não foi validado com faturas reais de cada banco. Quando o PDF não for reconhecido, use o OFX da mesma fatura.

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
| `npm test` | Roda os testes unitários (`vitest run`) — não precisa do banco |
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
| `POST` | `/api/lancamentos/parcelado` | Cria um lançamento parcelado (`{ ...lancamento, totalParcelas, parcelaInicial?, modoValor?: 'total' \| 'parcela', confirmarDuplicado? }`). Retorna `409` com `details.codigo = 'PARCELAMENTO_PARECIDO'` se já existir um parecido e `confirmarDuplicado` não for `true` |
| `GET` | `/api/lancamentos/:id/parcelas` | Quantos lançamentos cada escopo atinge (`{ proximas, todas }`) |
| `PUT` | `/api/lancamentos/:id?escopo=` | Atualiza um lançamento (só o dono pode editar; de outro usuário retorna `404`). `escopo` = `esta` (padrão), `proximas` ou `todas` propaga descrição, valor, tipo e categoria às demais parcelas |
| `DELETE` | `/api/lancamentos/:id?escopo=` | Remove um lançamento e, conforme o `escopo`, as demais parcelas. Retorna `{ excluidos }` |

### Importação (`/api/importacoes`) — requer login

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/importacoes/analisar` | Recebe `multipart/form-data` com `arquivo` (PDF ou OFX, até 10 MB) e `senha` opcional (PDF protegido). Retorna os lançamentos identificados com o estado de cada um. Não grava nada |
| `POST` | `/api/importacoes/confirmar` | Grava os itens escolhidos (`{ origem: 'pdf' \| 'ofx', itens }`). Cada item é gravado em transação própria e a duplicidade é revalidada; retorna o resultado por item (`adicionado`, `ja_cadastrado` ou `erro`) |

Erros de leitura retornam `details.codigo`: `FORMATO_INVALIDO` (415), `ARQUIVO_CORROMPIDO`, `SEM_LANCAMENTOS`, `PDF_SENHA_NECESSARIA`, `PDF_SENHA_INCORRETA`, `PDF_SEM_TEXTO`, `PDF_NAO_RECONHECIDO` (422). Arquivo acima do limite retorna `413`.

## Banco de dados

O schema do Prisma ([server/prisma/schema.prisma](server/prisma/schema.prisma)) define três modelos principais:

- **Usuario**: `id`, `email` (único), `senhaHash`, `nome` (opcional)
- **Categoria**: `id`, `nome` (único, compartilhada entre usuários)
- **Lancamento**: `id`, `descricao`, `valor`, `tipo` (`receita`/`despesa`), `data`, `categoriaId`, `usuarioId` (dono do lançamento). Campos opcionais de parcelamento e importação:
  - `parcelamentoId`, `parcelaNumero`, `parcelaTotal`: ligam as parcelas de uma mesma compra
  - `origem` (`manual`/`pdf`/`ofx`): de onde veio o lançamento
  - `fitid` e `chaveImportacao`: gravados na criação e nunca alterados, usados para reconhecer o lançamento em importações futuras

Para inspecionar os dados visualmente, use o Prisma Studio:

```bash
npm --prefix server run prisma:studio
```

## Solução de problemas

- **Erro de conexão com o banco**: confirme que o container está rodando com `docker compose ps` e que `DATABASE_URL` em `server/.env` bate com as credenciais do `docker-compose.yml`.
- **Porta 5432 já em uso**: pare qualquer outro PostgreSQL local rodando na máquina ou ajuste a porta no `docker-compose.yml` e em `DATABASE_URL`.
- **Frontend não consegue falar com a API**: verifique se o backend está rodando na porta `3333` e se o proxy do Vite (`vite.config.ts`) aponta para o mesmo endereço.
- **Login funciona mas a sessão não persiste (sempre pede login de novo)**: confirme que `SESSION_SECRET` está definido em `server/.env` e que o frontend está rodando via `npm run dev`/proxy do Vite (não abrindo o backend direto em outra origem), já que o cookie de sessão depende de `credentials: 'include'` e de `CORS_ORIGIN` apontar exatamente para a origem do frontend.
- **Erro de coluna inexistente depois de atualizar o projeto**: há migration pendente — rode `npx prisma migrate deploy` dentro de `server/`.
- **"Não reconhecemos esta fatura" ao importar um PDF**: o leitor de PDF é genérico e não cobre todos os layouts; importe o arquivo OFX da mesma fatura.
- **`npm run build` falha com `out of memory`**: acontece com pouca memória livre (por exemplo, com Docker e os servidores de desenvolvimento abertos); feche o que não estiver usando e rode de novo.
- **`401 Não autenticado` em todas as chamadas**: normal se não houver sessão ativa — faça login pela tela inicial da aplicação antes de chamar `/api/categorias` ou `/api/lancamentos` diretamente.
