import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}

// Criar cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Tipos para as tabelas do Supabase (baseados nos tipos TypeScript existentes)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'area' | 'secretaria_geral' | 'conselho_admin' | 'master';
          department: 'capital_humano' | 'juridico' | 'financas' | null;
          signature_url: string | null;
          stamp_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      areas: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['areas']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['areas']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          title: string;
          type: 'memorando' | 'oficio' | 'relatorio' | 'contrato' | 'outro';
          description: string;
          file_name: string;
          signed_pdf_url: string | null;
          created_by: string;
          created_by_name: string;
          created_by_role: 'area' | 'secretaria_geral' | 'conselho_admin' | 'master';
          created_by_department: 'capital_humano' | 'juridico' | 'financas' | null;
          status: 'pendente_secretaria' | 'pendente_conselho' | 'aprovado' | 'rejeitado' | 'finalizado';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      document_actions: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          user_name: string;
          user_role: 'area' | 'secretaria_geral' | 'conselho_admin' | 'master';
          action: string;
          comment: string | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['document_actions']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['document_actions']['Insert']>;
      };
      document_signatures: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          user_name: string;
          role: 'area' | 'secretaria_geral' | 'conselho_admin' | 'master';
          signature_url: string | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['document_signatures']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['document_signatures']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          document_id: string;
          read: boolean;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'timestamp' | 'read'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
};
