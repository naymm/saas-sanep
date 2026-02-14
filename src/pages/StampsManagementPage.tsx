import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { CompanyStamp, Company } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Stamp, Trash2, Plus, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';

const StampsManagementPage = () => {
  const user = useStore((s) => s.user);
  const companies = useStore((s) => s.companies);
  const companyStamps = useStore((s) => s.companyStamps);
  const createCompanyStamp = useStore((s) => s.createCompanyStamp);
  const updateCompanyStamp = useStore((s) => s.updateCompanyStamp);
  const deleteCompanyStamp = useStore((s) => s.deleteCompanyStamp);
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<CompanyStamp | null>(null);
  const [deleteStampId, setDeleteStampId] = useState<string | null>(null);
  const [stampUrls, setStampUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<{
    companyId: string;
    title: string;
    stampFile: File | null;
  }>({
    companyId: '',
    title: '',
    stampFile: null,
  });

  useEffect(() => {
    if (user?.role === 'master') {
      resolveStampUrls();
    }
  }, [user, companyStamps]);

  // Resolver URLs dos carimbos
  const resolveStampUrls = async () => {
    const urls: Record<string, string> = {};
    for (const stamp of companyStamps) {
      if (stamp.stampUrl.startsWith('http') || stamp.stampUrl.startsWith('data:') || stamp.stampUrl.startsWith('blob:')) {
        urls[stamp.id] = stamp.stampUrl;
      } else {
        try {
          urls[stamp.id] = await supabaseService.getSignatureOrStampUrl(stamp.stampUrl);
        } catch (error) {
          console.error('Erro ao resolver URL do carimbo:', error);
          urls[stamp.id] = stamp.stampUrl;
        }
      }
    }
    setStampUrls(urls);
  };

  if (!user || user.role !== 'master') {
    return (
      <div className="flex h-full items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Acesso negado. Apenas usuários master podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = () => {
    setFormData({ companyId: '', title: '', stampFile: null });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (stampToEdit: CompanyStamp) => {
    setSelectedStamp(stampToEdit);
    setFormData({
      companyId: stampToEdit.companyId,
      title: stampToEdit.title,
      stampFile: null,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (stampId: string) => {
    setDeleteStampId(stampId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.companyId || !formData.title || !formData.stampFile) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios (empresa, título e arquivo).',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      // Usar um userId temporário para upload (será ignorado na tabela company_stamps)
      // Mas precisamos de um userId válido para o caminho do Storage
      const tempUserId = user.id; // Usar ID do master temporariamente
      const storagePath = await supabaseService.uploadStamp(tempUserId, formData.stampFile, formData.title);
      const stampUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      await createCompanyStamp({
        companyId: formData.companyId,
        title: formData.title,
        stampUrl,
      });
      toast({ title: 'Carimbo cadastrado com sucesso!' });
      setIsCreateDialogOpen(false);
      setFormData({ companyId: '', title: '', stampFile: null });
    } catch (error) {
      console.error('Erro ao criar carimbo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o carimbo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedStamp || !formData.companyId || !formData.title) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      let stampUrl = selectedStamp.stampUrl;

      // Se um novo arquivo foi selecionado, fazer upload
      if (formData.stampFile) {
        const tempUserId = user.id;
        const storagePath = await supabaseService.uploadStamp(tempUserId, formData.stampFile, formData.title);
        stampUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      }

      await updateCompanyStamp(selectedStamp.id, {
        companyId: formData.companyId,
        title: formData.title,
        stampUrl,
      });
      toast({ title: 'Carimbo atualizado com sucesso!' });
      setIsEditDialogOpen(false);
      setSelectedStamp(null);
      setFormData({ companyId: '', title: '', stampFile: null });
    } catch (error) {
      console.error('Erro ao atualizar carimbo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o carimbo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteStampId) return;

    try {
      setIsLoading(true);
      await deleteCompanyStamp(deleteStampId);
      toast({ title: 'Carimbo removido com sucesso!' });
      setIsDeleteDialogOpen(false);
      setDeleteStampId(null);
    } catch (error) {
      console.error('Erro ao deletar carimbo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o carimbo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Carimbos</h1>
          <p className="text-muted-foreground">Gerencie os carimbos gerais por empresa. Uma empresa pode ter vários carimbos, cada um com seu título. Todos os membros do conselho veem os mesmos carimbos.</p>
        </div>
        <Button onClick={handleCreate} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Carimbo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stamp className="h-5 w-5" />
            Lista de Carimbos ({companyStamps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && companyStamps.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Carregando...</div>
          ) : companyStamps.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum carimbo cadastrado.</div>
          ) : (
            <div className="divide-y">
              {companyStamps.map((stamp) => (
                <div
                  key={stamp.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="rounded-lg border bg-accent p-2">
                      <img
                        src={stampUrls[stamp.id] || stamp.stampUrl}
                        alt={`Carimbo ${stamp.company?.name || 'Empresa'}`}
                        className="h-16 w-16 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{stamp.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {stamp.company?.name || 'Empresa'} ({stamp.company?.code || ''})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Carimbo geral - todos os membros do conselho veem este carimbo
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(stamp)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(stamp.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Carimbo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empresa *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título do Carimbo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Carimbo de Aprovação, Carimbo de Revisão, etc."
              />
            </div>
            <div>
              <Label>Arquivo do Carimbo (PNG) *</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formData.stampFile ? formData.stampFile.name : 'Selecione um arquivo PNG'}
                </span>
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        toast({
                          title: 'Erro',
                          description: 'Por favor, selecione um arquivo de imagem (PNG).',
                          variant: 'destructive',
                        });
                        return;
                      }
                      setFormData({ ...formData, stampFile: file });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate} disabled={isLoading}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setSelectedStamp(null);
          setFormData({ companyId: '', title: '', stampFile: null });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Carimbo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empresa *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título do Carimbo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Carimbo de Aprovação, Carimbo de Revisão, etc."
              />
            </div>
            <div>
              <Label>Novo Arquivo do Carimbo (PNG) - Opcional</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formData.stampFile ? formData.stampFile.name : 'Manter arquivo atual ou selecionar novo'}
                </span>
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        toast({
                          title: 'Erro',
                          description: 'Por favor, selecione um arquivo de imagem (PNG).',
                          variant: 'destructive',
                        });
                        return;
                      }
                      setFormData({ ...formData, stampFile: file });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit} disabled={isLoading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmar Deletar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este carimbo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isLoading}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StampsManagementPage;
