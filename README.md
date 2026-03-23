# Front Lista de Tarefas

[Link para testar(Vercel)](https://front-teste-tecnico-tarefas.vercel.app/)

[Vídeo demonstrativo](https://www.youtube.com/watch?v=M-cdC1eMgZI)

SPA em **Angular 21** para listagem, cadastro, edição, exclusão e reordenação de tarefas consumindo a **API REST** (Java/Spring). Interface com **locale pt-BR**, entrada de custo e data no **formato brasileiro**, destaque visual para **alto custo** (quando a API sinaliza `altoCusto`) e tratamento de erros alinhado a **RFC 7807** (`ProblemDetail`) na camada HTTP.

---

## O que foi implementado

- **Listagem de tarefas** com somatório de custos retornado pela API.
- **Inclusão e edição** com validação de nome obrigatório, custo ≥ 0 e data limite válida (entrada **DD/MM/AAAA**; envio à API em **ISO `yyyy-MM-dd`**).
- **Exclusão** com confirmação.
- **Reordenação**: botões subir/descer e **arrastar e soltar** (Angular CDK) em desktop; em layout mobile o drag-and-drop é desativado.
- **Layout responsivo** (breakpoint para experiência mobile vs. desktop).
- **Estado de carregamento** e mensagens de erro de rede/servidor/duplicidade de nome.
- **Configuração de URL da API** via variável de ambiente / `.env`, com geração automática de `environment.generated.ts` antes de `npm start` e `npm run build`.
- **Proxy de desenvolvimento** (`proxy.conf.json`) para encaminhar `/api` ao backend local sem CORS no browser.

---

## Estrutura do projeto e responsabilidades


| Local                                       | Responsabilidade                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/main.ts`                               | Bootstrap da aplicação (`bootstrapApplication`), locale **pt-BR**.                                |
| `src/app/app.config.ts`                     | Providers globais: HTTP (`provideHttpClient` com `fetch`), rotas, listeners de erro, `LOCALE_ID`. |
| `src/app/app.routes.ts`                     | Rota principal: lista de tarefas em `''`; fallback `*`* → `''`.                                   |
| `src/app/tarefa/tarefa-list.component.*`    | Tela principal: formulário, lista, modais, drag-and-drop, validações de UI.                       |
| `src/app/tarefa/tarefa-api.service.ts`      | Chamadas HTTP, estado reativo (signals) da lista, validação de DTO e mapeamento de erros HTTP.    |
| `src/app/tarefa/tarefa-api-urls.ts`         | Montagem das URLs a partir de `environment.apiUrl`.                                               |
| `src/app/tarefa/tarefa.model.ts`            | Tipos/DTOs alinhados ao contrato da API.                                                          |
| `src/app/tarefa/problem-details.util.ts`    | Extração de mensagem de `ProblemDetail` / corpo de erro e helpers de mensagem HTTP.               |
| `src/environments/environment.ts`           | Reexporta `environment.generated.ts` (gerado).                                                    |
| `src/environments/environment.generated.ts` | **Gerado** — não editar manualmente; contém `apiUrl`.                                             |
| `scripts/generate-environment.mjs`          | Lê `.env` / variáveis de ambiente e gera `environment.generated.ts`.                              |
| `.env.example`                              | Exemplo de `NG_APP_API_URL` para desenvolvimento local.                                           |
| `proxy.conf.json`                           | Proxy de `/api` → backend (ex.: `http://localhost:8080`) durante `ng serve`.                      |


---

## Contrato com a API (referência)

O front consome a mesma base de rotas documentada na API (ex.: `GET/POST /api/tarefas`, `PUT/DELETE /api/tarefas/{id}`, `POST /api/tarefas/{id}/subir|descer`). A URL base vem de `environment.apiUrl` (sem barra final desnecessária).

Em desenvolvimento local, com proxy ativo, as requisições podem ir para `/api/...` conforme configurado no serviço e no `proxy.conf.json`.

---

## Variáveis de ambiente


| Variável         | Descrição                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `NG_APP_API_URL` | URL base da API (ex.: `http://localhost:8080`). Também aceita `API_URL` no script de geração. |


Copie `.env.example` para `.env` e ajuste se necessário. O arquivo `scripts/generate-environment.mjs` gera `src/environments/environment.generated.ts` nos hooks `prestart` e `prebuild`.

---

## Como rodar localmente

1. **Node.js** **≥ 20.19** e **npm** (recomendado npm 11+ conforme `packageManager` do projeto).
2. Instale dependências:

```bash
npm install
```

1. Configure a API (`.env` ou variáveis) e suba o backend na porta esperada (ex.: **8080**).
2. Inicie o front (gera `environment` e sobe o dev server):

```bash
npm start
```

A aplicação costuma abrir em `http://localhost:4200` (porta padrão do `ng serve`).

---

## Build de produção

```bash
npm run build
```

Saída em `dist/` (configuração padrão do Angular). Ajuste `NG_APP_API_URL` / `API_URL` no ambiente de CI ou deploy para apontar para a API em produção.

---

## Requisitos

- **Node.js** ≥ **20.19**
- **npm** (versão alinhada ao `packageManager` do `package.json`, quando aplicável)
- API **Lista de Tarefas** acessível na URL configurada em `NG_APP_API_URL`

---

## Observações

- O arquivo `src/environments/environment.generated.ts` é **gerado automaticamente**; alterações devem passar por `.env` / variáveis de ambiente e pelo script `npm run env:generate`.
- Em produção, **CORS** deve estar permitido no backend para a origem do front (ver documentação da API).

