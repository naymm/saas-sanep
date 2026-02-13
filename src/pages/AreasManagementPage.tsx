import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Area } from '@/types';
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

const AreasManagementPage = () => {
  const user = useStore((s) => s.user);
  const areas = useStore((s) => s.areas);
  const createArea = useStore((s) => s.createArea);
  const updateArea = useStore((s) => s.updateArea);
  const deleteArea = useStore((s) => s.deleteArea);
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);

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

  const handleEdit = (areaToEdit: Area) => {
    setSelectedArea(areaToEdit);
    setFormData({
      name: areaToEdit.name,
      code: areaToEdit.code,
      description: areaToEdit.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (areaId: string) => {
    setDeleteAreaId(areaId);
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
      await createArea({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      });

      toast({
        title: 'Sucesso',
        description: 'Área criada com sucesso.',
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: '', code: '', description: '' });
    } catch (error) {
      console.error('Erro ao criar área:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a área.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedArea || !formData.name || !formData.code) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateArea(selectedArea.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      });

      toast({
        title: 'Sucesso',
        description: 'Área atualizada com sucesso.',
      });

      setIsEditDialogOpen(false);
      setSelectedArea(null);
      setFormData({ name: '', code: '', description: '' });
    } catch (error) {
      console.error('Erro ao atualizar área:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a área.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteAreaId) {
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteArea(deleteAreaId);
      toast({
        title: 'Sucesso',
        description: 'Área excluída com sucesso.',
      });
      setDeleteAreaId(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Erro ao deletar área:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível excluir a área.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Áreas</h1>
          <p className="text-muted-foreground">Gerencie todas as áreas do sistema</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Área
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Áreas ({areas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">{area.name}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {area.code}
                    </span>
                  </div>
                  {area.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(area)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(area.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Área</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da área"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Código da área (ex: CH, JUR, FIN)"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da área"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Área</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da área"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Código da área"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da área"
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

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta área? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AreasManagementPage;
