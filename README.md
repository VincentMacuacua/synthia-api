# 🚀 API SYNTHIA - Guia Completo Passo a Passo

## 📁 O que tens nesta pasta

```
syntia-api/
├── src/
│   ├── config/
│   │   └── database.js          ← Ligação ao PostgreSQL
│   ├── controllers/
│   │   ├── authController.js    ← Login e Registro
│   │   ├── cursosController.js  ← Gestão de Cursos
│   │   ├── matriculasController.js
│   │   ├── progressoController.js
│   │   └── pagamentosController.js
│   ├── middleware/
│   │   └── auth.js              ← Verificação de JWT
│   ├── routes/
│   │   └── index.js             ← Todas as rotas
│   └── server.js                ← Servidor principal
├── .env.example                 ← Configurações de exemplo
├── .gitignore
├── package.json
└── README.md                    ← Este ficheiro
```

---

## ✅ PASSO 1 - Abrir no VSCode

1. Abre o VSCode
2. Clica em **File → Open Folder**
3. Seleciona a pasta **syntia-api**

---

## ✅ PASSO 2 - Abrir o Terminal

No VSCode: clica em **View → Terminal**

---

## ✅ PASSO 3 - Instalar dependências

No terminal, escreve:
```bash
npm install
```
Aguarda 1-2 minutos. Está a instalar tudo automaticamente.

---

## ✅ PASSO 4 - Configurar o ficheiro .env

1. Na pasta **syntia-api**, vês o ficheiro `.env.example`
2. Duplica esse ficheiro (Ctrl+C, Ctrl+V)
3. Renomeia a cópia para `.env` (sem o `.example`)
4. Abre o `.env` e muda estas linhas:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syntia_db
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_DO_POSTGRESQL
```

**Exemplo:** Se a tua senha do PostgreSQL é `12345`:
```env
DB_PASSWORD=12345
```

---

## ✅ PASSO 5 - Iniciar o servidor

```bash
npm run dev
```

Deves ver isto:
```
╔════════════════════════════════════════════╗
║      🚀 API SYNTHIA - PLATAFORMA          ║
╚════════════════════════════════════════════╝

✅ Servidor a correr em: http://localhost:3001
✅ Conectado ao PostgreSQL com sucesso!
```

---

## ✅ PASSO 6 - Testar se está a funcionar

Abre o **navegador** e vai para:
```
http://localhost:3001/health
```

Deves ver:
```json
{
  "sucesso": true,
  "mensagem": "✅ API Synthia está a funcionar!"
}
```

**🎉 PARABÉNS! O backend está pronto!**

---

## 📋 Todos os Endpoints Disponíveis

### 🔐 Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/registrar` | Criar conta |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/perfil` | Ver perfil (requer login) |

### 📚 Cursos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cursos` | Listar todos os cursos |
| GET | `/api/cursos/:id` | Ver detalhes de um curso |
| POST | `/api/cursos` | Criar curso (só admin) |
| PUT | `/api/cursos/:id` | Editar curso (só admin) |

### 🎓 Matrículas
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/matriculas` | Matricular num curso |
| GET | `/api/matriculas/meus-cursos` | Ver meus cursos |
| DELETE | `/api/matriculas/:id` | Cancelar matrícula |

### 📊 Progresso
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/progresso/marcar` | Marcar aula como concluída |
| GET | `/api/progresso/curso/:id` | Ver progresso num curso |
| GET | `/api/progresso/dashboard` | Resumo geral do aluno |

### 💳 Pagamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/pagamentos` | Registar pagamento |
| GET | `/api/pagamentos/meus` | Ver meus pagamentos |
| PUT | `/api/pagamentos/:id/confirmar` | Confirmar pagamento (só admin) |
| GET | `/api/pagamentos/todos` | Ver todos pagamentos (só admin) |

---

## 🧪 Exemplos de Teste

### Criar conta:
```bash
curl -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Silva","email":"joao@email.com","senha":"123456"}'
```

### Fazer login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","senha":"123456"}'
```

### Listar cursos:
```bash
curl http://localhost:3001/api/cursos
```

---

## ❌ Problemas Comuns

### "Cannot connect to PostgreSQL"
→ Verifica a senha no ficheiro `.env`
→ Verifica se o PostgreSQL está a correr

### "Module not found"
→ Corre `npm install` novamente

### "Port 3001 already in use"
→ Muda `PORT=3002` no ficheiro `.env`
