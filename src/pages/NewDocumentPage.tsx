import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { DocumentType, DOC_TYPE_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Send, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const NewDocumentPage = () => {
  const createDocument = useStore((s) => s.createDocument);
  const loading = useStore((s) => s.loading);
  const user = useStore((s) => s.user);
  const users = useStore((s) => s.users);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('memorando');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Estados para seleção de membro(s) do conselho (apenas para secretaria)
  const [conselhoAssignmentType, setConselhoAssignmentType] = useState<'single' | 'all'>('single');
  const [selectedConselhoUserId, setSelectedConselhoUserId] = useState<string>('');
  
  // Filtrar apenas membros do conselho
  const conselhoMembers = users.filter((u) => u.role === 'conselho_admin');
  const isSecretaria = user?.role === 'secretaria_geral';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos envios
    if (isSubmitting || loading) {
      console.warn('⚠️ Tentativa de envio duplicado bloqueada');
      return;
    }
    
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    
    if (!file) {
      toast({ title: 'Selecione um arquivo PDF', variant: 'destructive' });
      return;
    }
    
    // Validar seleção de membro(s) do conselho se for secretaria
    if (isSecretaria) {
      if (conselhoAssignmentType === 'single' && !selectedConselhoUserId) {
        toast({ 
          title: 'Selecione um membro do conselho', 
          variant: 'destructive' 
        });
        return;
      }
      if (conselhoAssignmentType === 'all' && conselhoMembers.length === 0) {
        toast({ 
          title: 'Nenhum membro do conselho encontrado', 
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createDocument({ 
        title, 
        type, 
        description, 
        fileName: fileName || file.name || 'documento.pdf',
        file,
        // Parâmetros de atribuição de conselho (apenas para secretaria)
        assignedToConselhoUserId: isSecretaria && conselhoAssignmentType === 'single' ? selectedConselhoUserId : undefined,
        assignedToAllConselho: isSecretaria && conselhoAssignmentType === 'all',
      });
      toast({ title: 'Documento enviado com sucesso!' });
      // Limpar formulário
      setTitle('');
      setDescription('');
      setFile(null);
      setFileName('');
      setSelectedConselhoUserId('');
      setConselhoAssignmentType('single');
      navigate('/meus-documentos');
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      toast({ 
        title: 'Erro ao criar documento', 
        description: error instanceof Error ? error.message : 'Não foi possível criar o documento',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Novo Documento</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do documento" />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição / Assunto *</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o assunto do documento" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Arquivo PDF *</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{file?.name || fileName || 'Clique para selecionar o arquivo PDF'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      setFile(selectedFile);
                      setFileName(selectedFile.name);
                    }
                  }}
                />
              </label>
              {file && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Seleção de membro(s) do conselho - apenas para secretaria */}
            {isSecretaria && conselhoMembers.length > 0 && (
              <div className="space-y-4 rounded-lg border p-4">
                <Label className="text-base font-semibold">Direcionar para Conselho de Administração</Label>
                <div className="space-y-3">
                  <Label className="text-sm">Selecione o destino do documento:</Label>
                  <RadioGroup
                    value={conselhoAssignmentType}
                    onValueChange={(value) => {
                      setConselhoAssignmentType(value as 'single' | 'all');
                      if (value === 'all') {
                        setSelectedConselhoUserId('');
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="single-new" />
                      <Label htmlFor="single-new" className="font-normal cursor-pointer">
                        Um membro específico do conselho
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-new" />
                      <Label htmlFor="all-new" className="font-normal cursor-pointer">
                        Todos os membros do conselho (para pareceres)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {conselhoAssignmentType === 'single' && (
                  <div className="space-y-2">
                    <Label htmlFor="conselho-member-new" className="text-sm">Selecione o membro:</Label>
                    <Select
                      value={selectedConselhoUserId}
                      onValueChange={setSelectedConselhoUserId}
                    >
                      <SelectTrigger id="conselho-member-new">
                        <SelectValue placeholder="Selecione um membro do conselho" />
                      </SelectTrigger>
                      <SelectContent>
                        {conselhoMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} {member.email && `(${member.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {conselhoAssignmentType === 'all' && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p className="text-muted-foreground">
                      O documento será enviado para todos os {conselhoMembers.length} membro(s) do conselho.
                      O primeiro que assinar encaminhará para o próximo, e após todos assinarem, o documento será finalizado automaticamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isSubmitting || loading}>
              {isSubmitting || loading ? (
                <>Processando...</>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {useStore.getState().user?.role === 'secretaria_geral' ? 'Enviar para Conselho de Administração' : 'Enviar para Secretaria Geral'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewDocumentPage;
