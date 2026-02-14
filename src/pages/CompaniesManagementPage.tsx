import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Company } from '@/types';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const CompaniesManagementPage = () => {
  const user = useStore((s) => s.user);
  const companies = useStore((s) => s.companies);
  const createCompany = useStore((s) => s.createCompany);
  const updateCompany = useStore((s) => s.updateCompany);
  const deleteCompany = useStore((s) => s.deleteCompany);
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
  }>({
    name: '',
    code: '',
    description: '',
  });

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
    setFormData({ name: '', code: '', description: '' });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (companyToEdit: Company) => {
    setSelectedCompany(companyToEdit);
    setFormData({
      name: companyToEdit.name,
      code: companyToEdit.code,
      description: companyToEdit.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (companyId: string) => {
    setDeleteCompanyId(companyId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.name || !formData.code) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createCompany({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      });
      toast({ title: 'Empresa criada com sucesso!' });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', code: '', description: '' });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a empresa.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedCompany || !formData.name || !formData.code) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateCompany(selectedCompany.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      });
      toast({ title: 'Empresa atualizada com sucesso!' });
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      setFormData({ name: '', code: '', description: '' });
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a empresa.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCompanyId) return;

    try {
      await deleteCompany(deleteCompanyId);
      toast({ title: 'Empresa removida com sucesso!' });
      setIsDeleteDialogOpen(false);
      setDeleteCompanyId(null);
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a empresa.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas para associar carimbos</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Empresas ({companies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhuma empresa cadastrada.</div>
          ) : (
            <div className="divide-y">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{company.name}</p>
                    <p className="text-sm text-muted-foreground">Código: {company.code}</p>
                    {company.description && (
                      <p className="text-sm text-muted-foreground mt-1">{company.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(company.id)}>
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
            <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Empresa A"
              />
            </div>
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: EMPA"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da empresa"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Empresa *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Empresa A"
              />
            </div>
            <div>
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: EMPA"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da empresa"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmar Deletar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta empresa? Esta ação não pode ser desfeita e também removerá o carimbo associado (se existir).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompaniesManagementPage;
