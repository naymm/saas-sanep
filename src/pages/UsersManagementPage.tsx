import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { User, UserRole, Department, ROLE_LABELS, DEPARTMENT_LABELS } from '@/types';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const UsersManagementPage = () => {
  const user = useStore((s) => s.user);
  const users = useStore((s) => s.users);
  const createUser = useStore((s) => s.createUser);
  const updateUser = useStore((s) => s.updateUser);
  const deleteUser = useStore((s) => s.deleteUser);
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    department?: Department;
  }>({
    name: '',
    email: '',
    role: 'area',
    department: undefined,
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
    setFormData({ name: '', email: '', role: 'area', department: undefined });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role,
      department: userToEdit.department,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    setDeleteUserId(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.role === 'area' && !formData.department) {
      toast({
        title: 'Erro',
        description: 'Selecione um departamento para usuários da área.',
        variant: 'destructive',
      });
      return;
    }

    createUser({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.role === 'area' ? formData.department : undefined,
    });

    toast({
      title: 'Sucesso',
      description: 'Usuário criado com sucesso.',
    });

    setIsCreateDialogOpen(false);
  };

  const handleSubmitEdit = () => {
    if (!selectedUser || !formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.role === 'area' && !formData.department) {
      toast({
        title: 'Erro',
        description: 'Selecione um departamento para usuários da área.',
        variant: 'destructive',
      });
      return;
    }

    updateUser(selectedUser.id, {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.role === 'area' ? formData.department : undefined,
    });

    toast({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso.',
    });

    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = () => {
    if (deleteUserId) {
      deleteUser(deleteUserId);
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.',
      });
      setDeleteUserId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Gerencie todos os usuários do sistema</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Usuários ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{u.name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <div className="mt-1 flex gap-2">
                    <span className="text-xs font-medium text-primary">
                      {ROLE_LABELS[u.role]}
                    </span>
                    {u.department && (
                      <span className="text-xs text-muted-foreground">
                        · {DEPARTMENT_LABELS[u.department]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(u)}
                    disabled={u.id === user.id}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(u.id)}
                    disabled={u.id === user.id}
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
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value, department: value === 'area' ? undefined : undefined })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="secretaria_geral">Secretaria Geral</SelectItem>
                  <SelectItem value="conselho_admin">Conselho de Administração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'area' && (
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={formData.department || ''}
                  onValueChange={(value: Department) =>
                    setFormData({ ...formData, department: value })
                  }
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capital_humano">Capital Humano</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="financas">Finanças</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value, department: value === 'area' ? undefined : undefined })
                }
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="secretaria_geral">Secretaria Geral</SelectItem>
                  <SelectItem value="conselho_admin">Conselho de Administração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'area' && (
              <div className="space-y-2">
                <Label htmlFor="edit-department">Departamento</Label>
                <Select
                  value={formData.department || ''}
                  onValueChange={(value: Department) =>
                    setFormData({ ...formData, department: value })
                  }
                >
                  <SelectTrigger id="edit-department">
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capital_humano">Capital Humano</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="financas">Finanças</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
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

export default UsersManagementPage;
