# Configuração do Supabase

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Como obter as credenciais:

1. Acesse https://app.supabase.com
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

## Configuração do Banco de Dados

1. Acesse o SQL Editor no painel do Supabase
2. Execute o arquivo `supabase/schema.sql` para criar todas as tabelas, índices e políticas RLS
3. Execute o arquivo `supabase/storage-setup.sql` para configurar o Storage de documentos
4. **Criar Usuário Master:**
   - Execute `supabase/create-master-user.sql` para criar o primeiro usuário master
   - OU execute `supabase/seed.sql` que já inclui o usuário master (email: `master@gov.ao`)
5. Execute o arquivo `supabase/seed.sql` para inserir dados iniciais (usuários, áreas, documentos)

**📖 Veja `CRIAR_USUARIO_MASTER.md` para instruções detalhadas sobre criação do usuário master.**

## Dados Iniciais

Para popular o banco com dados iniciais (usuários, áreas, documentos e notificações de exemplo):

1. Execute o arquivo `supabase/seed.sql` no SQL Editor do Supabase
2. Este script criará:
   - **6 usuários** (áreas, secretaria geral, conselho, master)
   - **3 áreas** (Capital Humano, Jurídico, Finanças)
   - **5 documentos** de exemplo em diferentes status
   - **5 notificações** de exemplo

**Nota:** 
- Os UUIDs são fixos para facilitar referências
- Execute o seed.sql apenas uma vez (usa `ON CONFLICT DO NOTHING` para evitar duplicatas)
- Você pode modificar os dados conforme necessário

## Ordem de Execução dos Scripts

Execute os scripts SQL nesta ordem:

1. `supabase/schema.sql` - Cria estrutura do banco
2. `supabase/storage-setup.sql` - Configura Storage
3. `supabase/seed.sql` - Insere dados iniciais

## Row Level Security (RLS)

O schema inclui políticas RLS configuradas:
- **Users/Areas**: Apenas usuários com role 'master' podem modificar
- **Documents**: Todos podem ler, usuários autenticados podem criar/modificar
- **Notifications**: Usuários só veem suas próprias notificações

## Armazenamento de PDFs

Os PDFs assinados são armazenados no Supabase Storage no bucket `documents`:
- Upload automático quando um documento é assinado
- URLs públicas geradas automaticamente
- Suporte a download e visualização

## Nota sobre Autenticação

Atualmente, o sistema usa autenticação simples por email. Para usar autenticação completa do Supabase Auth, será necessário:

1. Habilitar autenticação por email no Supabase
2. Atualizar o método `login` no store para usar `supabase.auth.signInWithPassword()`
3. Atualizar as políticas RLS para usar `auth.uid()` corretamente
