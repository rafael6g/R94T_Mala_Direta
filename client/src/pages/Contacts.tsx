import { useState, useMemo, useCallback, useRef } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Upload, Search, Trash2, Edit, ChevronLeft, ChevronRight, Users, ClipboardPaste, FileSpreadsheet, CheckCircle2, AlertCircle, FileUp, File } from "lucide-react";
import * as XLSX from "xlsx";

export default function Contacts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);

  const listIdFilter = selectedList !== "all" ? parseInt(selectedList) : undefined;

  const { data, isLoading } = trpc.contacts.list.useQuery({
    page, limit: 20, search: search || undefined, listId: listIdFilter,
  });
  const { data: lists } = trpc.lists.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => { toast.success("Contato criado com sucesso"); setShowAddDialog(false); utils.contacts.list.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => { toast.success("Contato atualizado"); setShowEditDialog(false); utils.contacts.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => { toast.success("Contato removido"); utils.contacts.list.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const importMutation = trpc.contacts.quickImport.useMutation({
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} contato(s) importado(s) com sucesso!`);
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} linha(s) com erro`);
      }
      if (result.imported === 0 && result.errors.length === 0) {
        toast.error("Nenhum contato foi encontrado nos dados colados.");
      }
      setShowImportDialog(false);
      utils.contacts.list.invalidate(); utils.lists.list.invalidate(); utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus contatos de e-mail marketing.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Importar contatos
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar contato
          </Button>
        </div>
      </div>

      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar contatos..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={selectedList} onValueChange={(v) => { setSelectedList(v); setPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por lista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contatos</SelectItem>
                {lists?.map((list) => (<SelectItem key={list.id} value={String(list.id)}>{list.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">{data?.total ?? 0} contato(s)</div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de criação</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                  ))
                ) : data?.contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum contato encontrado</p>
                        <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>Importar contatos</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">{(contact.firstName || contact.email).charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-sm">{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{contact.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.phone || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.company || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={contact.subscribed ? "default" : "secondary"} className="text-xs">
                          {contact.subscribed ? "Inscrito" : "Cancelado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(contact.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditContact(contact); setShowEditDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Remover este contato?")) deleteMutation.mutate({ id: contact.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddContactDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      {editContact && <EditContactDialog open={showEditDialog} onOpenChange={setShowEditDialog} contact={editContact} onSubmit={(data) => updateMutation.mutate({ id: editContact.id, ...data })} isLoading={updateMutation.isPending} />}
      <QuickImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} lists={lists || []} onSubmit={(data) => importMutation.mutate(data)} isLoading={importMutation.isPending} />
    </div>
  );
}

function AddContactDialog({ open, onOpenChange, onSubmit, isLoading }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (data: any) => void; isLoading: boolean; }) {
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "", company: "" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle><DialogDescription>Preencha os dados do novo contato.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>E-mail *</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Nome" /></div>
            <div><Label>Sobrenome</Label><Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Sobrenome" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
            <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Empresa" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit(form)} disabled={!form.email || isLoading}>{isLoading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditContactDialog({ open, onOpenChange, contact, onSubmit, isLoading }: { open: boolean; onOpenChange: (v: boolean) => void; contact: any; onSubmit: (data: any) => void; isLoading: boolean; }) {
  const [form, setForm] = useState({ email: contact.email || "", firstName: contact.firstName || "", lastName: contact.lastName || "", phone: contact.phone || "", company: contact.company || "" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Contato</DialogTitle><DialogDescription>Atualize os dados do contato.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>E-mail *</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><Label>Sobrenome</Label><Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit(form)} disabled={!form.email || isLoading}>{isLoading ? "Salvando..." : "Atualizar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickImportDialog({ open, onOpenChange, lists, onSubmit, isLoading }: { open: boolean; onOpenChange: (v: boolean) => void; lists: any[]; onSubmit: (data: { rawText: string; listId?: number }) => void; isLoading: boolean; }) {
  const [rawText, setRawText] = useState("");
  const [listId, setListId] = useState<string>("none");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Process Excel/CSV file into tab-separated text
  const processFile = useCallback((file: globalThis.File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const text = XLSX.utils.sheet_to_csv(firstSheet, { FS: "\t" });
          setRawText(text);
          setFileName(file.name);
          toast.success(`Arquivo "${file.name}" carregado com sucesso`);
        } catch {
          toast.error("Erro ao processar o arquivo Excel. Verifique se o formato está correto.");
        }
      };
      reader.onerror = () => toast.error("Erro ao ler o arquivo");
      reader.readAsArrayBuffer(file);
    } else if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setRawText(text);
        setFileName(file.name);
        toast.success(`Arquivo "${file.name}" carregado com sucesso`);
      };
      reader.onerror = () => toast.error("Erro ao ler o arquivo");
      reader.readAsText(file);
    } else {
      toast.error("Formato não suportado. Use .xlsx, .xls, .csv ou .txt");
    }
  }, []);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  // Parse and preview the pasted data
  const preview = useMemo(() => {
    if (!rawText.trim()) return null;
    const lines = rawText.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) return null;

    const firstLine = lines[0];
    const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    const headerKeywords = ["email", "e-mail", "nome", "name", "firstname", "sobrenome", "lastname", "telefone", "phone", "empresa", "company", "contato"];
    const firstLineCells = firstLine.split(separator).map(c => c.trim().toLowerCase());
    const looksLikeHeader = firstLineCells.some(cell => {
      const normalized = cell.replace(/[^a-z0-9]/g, "");
      return headerKeywords.includes(normalized);
    }) && !firstLine.includes("@");

    const headerRow = looksLikeHeader ? firstLine.split(separator).map(c => c.trim()) : null;
    const dataLines = looksLikeHeader ? lines.slice(1) : lines;
    const previewData = dataLines.slice(0, 5).map(line => line.split(separator).map(c => c.trim()));
    const emailCount = dataLines.filter(line => {
      const cells = line.split(separator);
      return cells.some(c => c.includes("@"));
    }).length;

    return {
      headerRow,
      previewData,
      totalDataLines: dataLines.length,
      emailCount,
      hasHeader: looksLikeHeader,
      separator: separator === "\t" ? "TAB" : separator === ";" ? ";" : ",",
    };
  }, [rawText]);

  const handleReset = () => {
    setRawText("");
    setListId("none");
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Importação Rápida de Contatos
          </DialogTitle>
          <DialogDescription>
            Arraste um arquivo Excel/CSV para dentro ou cole os dados diretamente. O sistema detecta automaticamente as colunas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.tsv"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Drop zone / Paste area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Dados dos contatos</Label>
              {rawText && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-7">
                  Limpar
                </Button>
              )}
            </div>
            {!rawText ? (
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  const textarea = document.getElementById("import-textarea");
                  if (textarea) textarea.focus();
                }}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01] shadow-lg"
                    : "hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                {isDragging ? (
                  <>
                    <FileUp className="h-12 w-12 text-primary mx-auto mb-3 animate-bounce" />
                    <p className="font-semibold text-primary text-lg mb-1">Solte o arquivo aqui!</p>
                    <p className="text-sm text-primary/70">Excel (.xlsx, .xls), CSV ou TXT</p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileUp className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                    <p className="font-semibold text-foreground text-base mb-1">Arraste sua planilha aqui</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      ou cole dados com <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 mb-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" /> Selecionar arquivo
                    </Button>
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-muted/50 px-2 py-1 rounded flex items-center gap-1"><File className="h-3 w-3" /> Excel (.xlsx)</span>
                      <span className="bg-muted/50 px-2 py-1 rounded flex items-center gap-1"><File className="h-3 w-3" /> CSV</span>
                      <span className="bg-muted/50 px-2 py-1 rounded flex items-center gap-1"><ClipboardPaste className="h-3 w-3" /> Colar dados</span>
                    </div>
                    <Textarea
                      id="import-textarea"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="opacity-0 absolute h-0 w-0 pointer-events-none"
                      tabIndex={-1}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {fileName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{fileName}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => { fileInputRef.current?.click(); }}>Trocar arquivo</Button>
                  </div>
                )}
                <Textarea
                  id="import-textarea"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"email@exemplo.com\tNome\tSobrenome\noutro@email.com\tJoão\tSilva"}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Preview section */}
          {preview && (
            <div className="space-y-3">
              {/* Stats bar */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-2">
                  {preview.emailCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">
                    {preview.emailCount > 0
                      ? `${preview.emailCount} e-mail(s) detectado(s)`
                      : "Nenhum e-mail detectado"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">{preview.totalDataLines} linha(s) de dados</span>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs text-muted-foreground">Separador: {preview.separator}</span>
                {preview.hasHeader && (
                  <>
                    <span className="text-xs text-muted-foreground">|</span>
                    <span className="text-xs text-green-600 font-medium">Cabeçalho detectado</span>
                  </>
                )}
              </div>

              {/* Data preview table */}
              <div className="rounded-md border overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pré-visualização {preview.totalDataLines > 5 ? `(primeiras 5 de ${preview.totalDataLines} linhas)` : `(${preview.totalDataLines} linhas)`}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="text-sm w-full">
                    {preview.headerRow && (
                      <thead>
                        <tr className="bg-muted/20">
                          {preview.headerRow.map((cell, j) => (
                            <th key={j} className="px-3 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap border-b">{cell || "-"}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {preview.previewData.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/10"}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-1.5 whitespace-nowrap text-sm">
                              {cell.includes("@") ? (
                                <span className="text-primary font-medium">{cell}</span>
                              ) : (
                                <span className="text-muted-foreground">{cell || "-"}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* List selection */}
          <div>
            <Label className="text-sm font-medium">Adicionar à lista (opcional)</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma lista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma lista</SelectItem>
                {lists.map((list) => (<SelectItem key={list.id} value={String(list.id)}>{list.name} ({list.contactCount} contatos)</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            onClick={() => onSubmit({ rawText, listId: listId !== "none" ? parseInt(listId) : undefined })}
            disabled={!rawText.trim() || isLoading || (preview?.emailCount ?? 0) === 0}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isLoading ? "Importando..." : `Importar ${preview?.emailCount ?? 0} contato(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
