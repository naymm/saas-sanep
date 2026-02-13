import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { DocumentType, DOC_TYPE_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const NewDocumentPage = () => {
  const createDocument = useStore((s) => s.createDocument);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('memorando');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    createDocument({ title, type, description, fileName: fileName || 'documento.pdf' });
    toast({ title: 'Documento enviado com sucesso!' });
    navigate('/meus-documentos');
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
              <Label>Arquivo PDF</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:bg-accent">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{fileName || 'Clique para selecionar o arquivo PDF'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                />
              </label>
            </div>

            <Button type="submit" className="w-full gap-2">
              <Send className="h-4 w-4" /> {useStore.getState().user?.role === 'secretaria_geral' ? 'Enviar para Conselho de Administração' : 'Enviar para Secretaria Geral'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewDocumentPage;
