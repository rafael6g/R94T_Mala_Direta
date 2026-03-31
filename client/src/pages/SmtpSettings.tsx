import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Loader2, CheckCircle2, Send } from "lucide-react";

export default function SmtpSettings() {
  const { data: smtp, isLoading } = trpc.smtp.get.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    encryption: "tls" as "none" | "ssl" | "tls",
    fromEmail: "",
    fromName: "Real 94",
  });

  useEffect(() => {
    if (smtp) {
      setForm({
        host: smtp.host || "",
        port: String(smtp.port || 587),
        username: smtp.username || "",
        password: smtp.password || "",
        encryption: (smtp.encryption as "none" | "ssl" | "tls") || "tls",
        fromEmail: smtp.fromEmail || "",
        fromName: smtp.fromName || "Real 94",
      });
    }
  }, [smtp]);

  const saveMutation = trpc.smtp.save.useMutation({
    onSuccess: () => {
      toast.success("Configurações SMTP salvas com sucesso");
      utils.smtp.get.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testMutation = trpc.smtp.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!form.host || !form.username || !form.password || !form.fromEmail) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    saveMutation.mutate({
      host: form.host,
      port: parseInt(form.port),
      username: form.username,
      password: form.password,
      encryption: form.encryption,
      fromEmail: form.fromEmail,
      fromName: form.fromName,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações SMTP</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure o servidor de e-mail para envio de campanhas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Servidor SMTP
          </CardTitle>
          <CardDescription>
            Informe as credenciais do seu servidor SMTP (Gmail, Outlook, SendGrid, Brevo, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Host SMTP *</Label>
              <Input value={form.host} onChange={(e) => setForm(f => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label>Porta *</Label>
              <Input value={form.port} onChange={(e) => setForm(f => ({ ...f, port: e.target.value }))} placeholder="587" type="number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usuário *</Label>
              <Input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder="••••••••" />
            </div>
          </div>
          <div>
            <Label>Criptografia</Label>
            <Select value={form.encryption} onValueChange={(v: "none" | "ssl" | "tls") => setForm(f => ({ ...f, encryption: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">Nenhuma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail do remetente *</Label>
                <Input value={form.fromEmail} onChange={(e) => setForm(f => ({ ...f, fromEmail: e.target.value }))} placeholder="contato@real94.com.br" />
              </div>
              <div>
                <Label>Nome do remetente</Label>
                <Input value={form.fromName} onChange={(e) => setForm(f => ({ ...f, fromName: e.target.value }))} placeholder="Real 94" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar configurações
            </Button>
            {smtp && (
              <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="gap-2">
                {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Testar conexão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provedores populares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium">Gmail</p>
              <p className="text-muted-foreground text-xs mt-1">Host: smtp.gmail.com | Porta: 587 | TLS</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium">Outlook/Hotmail</p>
              <p className="text-muted-foreground text-xs mt-1">Host: smtp-mail.outlook.com | Porta: 587 | TLS</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium">Brevo (Sendinblue)</p>
              <p className="text-muted-foreground text-xs mt-1">Host: smtp-relay.brevo.com | Porta: 587 | TLS</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium">SendGrid</p>
              <p className="text-muted-foreground text-xs mt-1">Host: smtp.sendgrid.net | Porta: 587 | TLS</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
