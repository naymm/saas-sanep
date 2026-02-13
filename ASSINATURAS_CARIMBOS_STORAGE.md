# Assinaturas e Carimbos no Supabase Storage

## Implementação

As assinaturas e carimbos dos usuários agora são salvos no **Supabase Storage** ao invés de apenas URLs no banco de dados.

## Estrutura de Armazenamento

- **Bucket**: `documents` (mesmo bucket usado para PDFs)
- **Assinaturas**: `documents/signatures/{userId}/{filename}`
- **Carimbos**: `documents/stamps/{userId}/{filename}`

## Funcionalidades

### Upload de Assinaturas e Carimbos

1. **Upload direto de arquivo**: Quando o usuário seleciona um arquivo PNG, ele é enviado diretamente para o Storage
2. **Conversão de URLs**: Se uma data URL ou blob URL for fornecida, ela é convertida para File e enviada ao Storage
3. **Remoção**: Ao remover uma assinatura/carimbo, o arquivo antigo é deletado do Storage (se existir)

### Resolução de URLs

As URLs são resolvidas automaticamente quando os usuários são carregados:
- Se a URL no banco começa com `http`, `data:` ou `blob:`, é usada diretamente
- Caso contrário, assume-se que é um caminho do Storage e a URL pública é obtida

## Arquivos Modificados

### `src/lib/supabaseService.ts`
- Adicionadas funções:
  - `uploadSignature(userId, file)` - Upload de assinatura
  - `uploadStamp(userId, file)` - Upload de carimbo
  - `getSignatureOrStampUrl(filePath)` - Obter URL pública
  - `deleteSignatureOrStamp(filePath)` - Deletar arquivo
- Atualizadas funções de busca de usuários para resolver URLs do Storage automaticamente

### `src/store/useStore.ts`
- `updateSignature` e `updateStamp` agora aceitam `string | File`
- Lógica para:
  - Upload de arquivos diretos
  - Conversão de data URLs/blob URLs para arquivos
  - Remoção de arquivos antigos do Storage

### `src/pages/ProfilePage.tsx`
- Atualizado para enviar o arquivo diretamente ao invés de criar blob URL
- Validação de tipo de arquivo
- Tratamento de erros melhorado

## Configuração

As políticas de Storage já configuradas no `storage-setup.sql` se aplicam automaticamente às pastas `signatures/` e `stamps/`.

## Migração de Dados Existentes

Se você já tem assinaturas/carimbos salvos como URLs no banco:
1. As URLs antigas continuarão funcionando (se forem URLs públicas)
2. Ao atualizar uma assinatura/carimbo, o novo arquivo será salvo no Storage
3. URLs antigas (data URLs ou blob URLs) serão automaticamente convertidas e enviadas ao Storage na próxima atualização

## Benefícios

- ✅ Armazenamento centralizado e gerenciável
- ✅ URLs públicas estáveis
- ✅ Melhor organização dos arquivos
- ✅ Facilita backup e migração
- ✅ Compatível com políticas RLS do Supabase
