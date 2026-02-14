-- ==================== CORRIGIR POLÍTICA RLS PARA NOTIFICATIONS ====================
-- Este script corrige a política RLS para permitir que notificações funcionem corretamente
-- IMPORTANTE: Usa auth_user_id para vincular com auth.uid()
-- Execute este script no SQL Editor do Supabase

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Notifications are viewable by everyone" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow update notifications" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications SELECT" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications INSERT" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications UPDATE" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Criar políticas corrigidas que usam auth_user_id
-- SELECT: Usuários podem ver apenas suas próprias notificações (verificando via auth_user_id)
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = notifications.user_id 
      AND auth_user_id = auth.uid()
    )
  );

-- INSERT: Usuários autenticados podem criar notificações para outros usuários
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Usuários podem atualizar apenas suas próprias notificações (verificando via auth_user_id)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = notifications.user_id 
      AND auth_user_id = auth.uid()
    )
  );

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- ==================== VERIFICAR NOTIFICAÇÕES ====================
-- Execute esta query para verificar notificações existentes:
SELECT 
  n.id,
  n.user_id,
  u.name as user_name,
  u.email,
  u.auth_user_id,
  n.message,
  n.document_id,
  n.read,
  n.timestamp
FROM notifications n
LEFT JOIN users u ON u.id = n.user_id
ORDER BY n.timestamp DESC
LIMIT 20;
