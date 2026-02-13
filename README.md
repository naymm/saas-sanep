# Fluxo Seguro - Sistema de Gestão de Documentos

Sistema de gestão de fluxo de documentos com assinatura digital integrada ao Supabase.

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://app.supabase.com)
2. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

3. Execute os scripts SQL no SQL Editor do Supabase (nesta ordem):
   - `supabase/schema.sql` - Cria todas as tabelas e políticas
   - `supabase/storage-setup.sql` - Configura o Storage para PDFs
   - `supabase/seed.sql` - Insere dados iniciais (usuários, áreas, documentos)

### 3. Executar o Projeto

```bash
npm run dev
```

## 📋 Dados Iniciais

O script `seed.sql` cria:

- **6 Usuários:**
  - Carlos Mendes (rh@gov.ao) - Área - Capital Humano
  - Ana Silva (secretaria@gov.ao) - Secretaria Geral
  - João Ferreira (conselho@gov.ao) - Conselho de Administração
  - Pedro Neto (juridico@gov.ao) - Área - Jurídico
  - Luísa Gomes (financas@gov.ao) - Área - Finanças
  - Administrador Master (master@gov.ao) - Master

- **3 Áreas:**
  - Capital Humano (CH)
  - Jurídico (JUR)
  - Finanças (FIN)

- **5 Documentos de exemplo** em diferentes status

- **5 Notificações** relacionadas aos documentos

## 🔐 Login

Use qualquer email dos usuários cadastrados para fazer login. A senha não é validada no momento (autenticação simples por email).

### Criar Usuário Master

Para criar o primeiro usuário master (necessário para gerenciar outros usuários):

1. Execute `supabase/create-master-user.sql` no SQL Editor do Supabase
2. OU execute `supabase/seed.sql` que já inclui o usuário master
3. Faça login com o email `master@gov.ao`

**Veja o arquivo `CRIAR_USUARIO_MASTER.md` para instruções detalhadas.**

## 📦 Estrutura do Projeto

```
src/
  ├── components/     # Componentes React
  ├── pages/          # Páginas da aplicação
  ├── lib/            # Utilitários e serviços
  │   ├── supabase.ts          # Cliente Supabase
  │   ├── supabaseService.ts   # Serviços de dados
  │   ├── pdfUtils.ts          # Utilitários de PDF
  │   └── pdfStorage.ts        # Gerenciamento de Storage
  ├── store/          # Estado global (Zustand)
  └── types.ts        # Tipos TypeScript
```

## 🗄️ Banco de Dados

Todas as tabelas são criadas automaticamente pelo `schema.sql`:

- `users` - Usuários do sistema
- `areas` - Áreas/Departamentos
- `documents` - Documentos
- `document_actions` - Histórico de ações
- `document_signatures` - Assinaturas digitais
- `notifications` - Notificações

## 📄 Armazenamento de PDFs

Os PDFs assinados são armazenados no Supabase Storage no bucket `documents`. O upload é automático quando um documento é assinado.

## 🔧 Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview
npm run preview

# Testes
npm test
```

## 📝 Notas

- O sistema usa autenticação simples por email (sem validação de senha)
- Para produção, recomenda-se implementar autenticação completa do Supabase Auth
- Os PDFs originais devem estar na pasta `public/` para serem acessíveis
- As assinaturas padrão devem estar na pasta `src/assinaturas/` ou no Storage
