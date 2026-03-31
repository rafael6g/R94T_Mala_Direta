import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
};

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  define_subject: "Assunto definido",
  confirm_subject: "Assunto confirmado",
  set_content: "Conteúdo definido",
  send_test: "Teste enviado",
  send_campaign_start: "Envio iniciado",
  send_campaign_complete: "Envio concluído",
  send_campaign_error: "Erro no envio",
  quick_import: "Importação rápida",
};

export default function Audit() {
  const { data, isLoading } = trpc.audit.list.useQuery({ page: 1, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground text-sm mt-1">Histórico completo de operações do sistema.</p>
      </div>

      <Card className="border">
        <CardContent className="p-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                  ))
                ) : !data || data.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum registro de auditoria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{statusIcons[log.status] || statusIcons.success}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{log.entityType?.replace("_", " ") || "-"}</TableCell>
                      <TableCell className="text-sm max-w-sm truncate">{log.details || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
