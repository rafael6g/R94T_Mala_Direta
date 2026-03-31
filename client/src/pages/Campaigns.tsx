import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Send, Trash2, Edit, Eye } from "lucide-react";
import { useLocation } from "wouter";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  subject_defined: { label: "Assunto definido", variant: "outline" },
  subject_confirmed: { label: "Assunto confirmado", variant: "outline" },
  content_ready: { label: "Conteúdo pronto", variant: "outline" },
  test_sent: { label: "Teste enviado", variant: "default" },
  sending: { label: "Enviando...", variant: "default" },
  sent: { label: "Enviada", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

export default function Campaigns() {
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => { toast.success("Campanha removida"); utils.campaigns.list.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas campanhas de e-mail marketing.</p>
        </div>
        <Button onClick={() => setLocation("/campaigns/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Criar campanha
        </Button>
      </div>

      <Card className="border">
        <CardContent className="p-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                  ))
                ) : !campaigns || campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Send className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhuma campanha criada</p>
                        <Button variant="outline" size="sm" onClick={() => setLocation("/campaigns/new")}>Criar primeira campanha</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => {
                    const st = statusMap[campaign.status] || { label: campaign.status, variant: "secondary" as const };
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <span className="font-medium text-sm">{campaign.name}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{campaign.subject || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{campaign.recipientCount ?? 0}</TableCell>
                        <TableCell className="text-sm">{campaign.sentCount ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString("pt-BR") : new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/campaigns/${campaign.id}/edit`)}>
                              {campaign.status === "sent" ? <Eye className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                            </Button>
                            {campaign.status !== "sending" && campaign.status !== "sent" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Remover esta campanha?")) deleteMutation.mutate({ id: campaign.id }); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
