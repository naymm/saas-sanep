import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { ROLE_LABELS, DEPARTMENT_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, PenTool, Stamp, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const user = useStore((s) => s.user)!;
  const updateSignature = useStore((s) => s.updateSignature);
  const updateStamp = useStore((s) => s.updateStamp);
  const { toast } = useToast();

  const handleFileUpload = (type: 'signature' | 'stamp') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: 'Erro', 
        description: 'Por favor, selecione um arquivo de imagem (PNG, JPG, etc.)',
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Fazer upload direto do File para o Storage
      if (type === 'signature') {
        await updateSignature(file);
        toast({ title: 'Assinatura atualizada com sucesso!' });
      } else {
        await updateStamp(file);
        toast({ title: 'Carimbo atualizado com sucesso!' });
      }
    } catch (error) {
      console.error(`Erro ao fazer upload do ${type}:`, error);
      toast({ 
        title: 'Erro', 
        description: `Não foi possível fazer upload do ${type === 'signature' ? 'assinatura' : 'carimbo'}.`,
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Informações Pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium text-foreground">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Perfil</span>
            <span className="text-foreground">{user.role === 'area' && user.department ? DEPARTMENT_LABELS[user.department] : ROLE_LABELS[user.role]}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PenTool className="h-4 w-4" /> Assinatura Digital</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {user.signatureUrl ? (
            <div className="flex items-center gap-4">
              <div className="rounded-lg border bg-accent p-4">
                <img src={user.signatureUrl} alt="Assinatura" className="h-16 object-contain" />
              </div>
              <Button variant="outline" size="sm" onClick={() => updateSignature('')} className="gap-1">
                <Trash2 className="h-3 w-3" /> Remover
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma assinatura cadastrada.</p>
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Fazer upload da assinatura (PNG com fundo transparente)</span>
            <input type="file" accept="image/png" className="hidden" onChange={handleFileUpload('signature')} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Stamp className="h-4 w-4" /> Carimbo Digital</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {user.stampUrl ? (
            <div className="flex items-center gap-4">
              <div className="rounded-lg border bg-accent p-4">
                <img src={user.stampUrl} alt="Carimbo" className="h-16 object-contain" />
              </div>
              <Button variant="outline" size="sm" onClick={() => updateStamp('')} className="gap-1">
                <Trash2 className="h-3 w-3" /> Remover
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum carimbo cadastrado.</p>
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Fazer upload do carimbo (PNG com fundo transparente)</span>
            <input type="file" accept="image/png" className="hidden" onChange={handleFileUpload('stamp')} />
          </label>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
