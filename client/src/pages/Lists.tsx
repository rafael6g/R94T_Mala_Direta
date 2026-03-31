import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Edit, ClipboardList, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Lists() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editList, setEditList] = useState<any>(null);
  const [, setLocation] = useLocation();

  const { data: lists, isLoading } = trpc.lists.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.lists.create.useMutation({
    onSuccess: () => {
      toast.success("Lista criada com sucesso");
      setShowCreateDialog(false);
      utils.lists.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.lists.update.useMutation({
    onSuccess: () => {
      toast.success("Lista atualizada");
      setShowEditDialog(false);
      utils.lists.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.lists.delete.useMutation({
    onSuccess: () => {
      toast.success("Lista removida");
      utils.lists.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seus contatos em listas para campanhas direcionadas.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar uma lista
        </Button>
      </div>

      <Card className="border">
        <CardContent className="p-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lista</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pasta</TableHead>
                  <TableHead>Contatos</TableHead>
                  <TableHead>Data de criação</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !lists || lists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhuma lista criada</p>
                        <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                          Criar primeira lista
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lists.map((list) => (
                    <TableRow key={list.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/contacts?list=${list.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{list.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{list.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{list.folder || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {list.contactCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(list.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditList(list); setShowEditDialog(true); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Remover esta lista?")) deleteMutation.mutate({ id: list.id });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create List Dialog */}
      <ListFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Criar Lista"
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit List Dialog */}
      {editList && (
        <ListFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          title="Editar Lista"
          initialData={editList}
          onSubmit={(data) => updateMutation.mutate({ id: editList.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ListFormDialog({ open, onOpenChange, title, initialData, onSubmit, isLoading }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initialData?: { name: string; description?: string | null; folder?: string | null };
  onSubmit: (data: { name: string; description?: string; folder?: string }) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    folder: initialData?.folder || "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Defina o nome e descrição da lista.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da lista *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Clientes VIP"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descrição opcional da lista"
              rows={3}
            />
          </div>
          <div>
            <Label>Pasta</Label>
            <Input
              value={form.folder}
              onChange={(e) => setForm(f => ({ ...f, folder: e.target.value }))}
              placeholder="Ex: Marketing"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit(form)} disabled={!form.name || isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
