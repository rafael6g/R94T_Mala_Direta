import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, ClipboardList, Mail, Send, FileText,
  Upload, Trash2, Paperclip, Image, Code, AlertTriangle, CheckCircle2, Loader2, FileUp, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  sanitizeHtmlForPreview,
  sanitizeHtmlForSend,
  validateHtmlSize,
  countDangerousElements,
  HTML_SIZE_LIMITS,
} from "@/lib/html-sanitizer";

type WizardStep = "list" | "subject" | "confirm_subject" | "content" | "test" | "send";

const STEPS: { key: WizardStep; label: string; icon: React.ComponentType<any> }[] = [
  { key: "list", label: "Destinatários", icon: ClipboardList },
  { key: "subject", label: "Assunto", icon: Mail },
  { key: "confirm_subject", label: "Confirmar Assunto", icon: Check },
  { key: "content", label: "Conteúdo", icon: FileText },
  { key: "test", label: "Homologação", icon: Send },
  { key: "send", label: "Enviar", icon: CheckCircle2 },
];

export default function CampaignWizard() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const editId = params.id ? parseInt(params.id) : null;

  const [campaignId, setCampaignId] = useState<number | null>(editId);
  const [currentStep, setCurrentStep] = useState<WizardStep>("list");
  const [campaignName, setCampaignName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [confirmedSubject, setConfirmedSubject] = useState("");
  const [contentType, setContentType] = useState<"html" | "image">("html");
  const [htmlContent, setHtmlContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [htmlImporting, setHtmlImporting] = useState(false);
  const [sanitizationInfo, setSanitizationInfo] = useState<{ removed: number; sizeFormatted: string } | null>(null);

  const { data: lists } = trpc.lists.list.useQuery();
  const { data: campaign, refetch: refetchCampaign } = trpc.campaigns.getById.useQuery(
    { id: campaignId! },
    { enabled: !!campaignId }
  );
  const utils = trpc.useUtils();

  // Load campaign data when editing
  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.name || "");
      setSelectedListId(campaign.listId ? String(campaign.listId) : "");
      setSubject(campaign.subject || "");
      setPreviewText(campaign.previewText || "");
      setSenderName(campaign.senderName || "");
      setSenderEmail(campaign.senderEmail || "");
      setContentType((campaign.contentType as "html" | "image") || "html");
      setHtmlContent(campaign.htmlContent || "");
      setImageUrl(campaign.imageUrl || "");
      setAttachments(campaign.attachments || []);

      // Determine current step based on status
      if (campaign.status === "sent" || campaign.status === "sending") {
        setCurrentStep("send");
      } else if (campaign.status === "test_sent") {
        setCurrentStep("send");
      } else if (campaign.status === "content_ready") {
        setCurrentStep("test");
      } else if (campaign.status === "subject_confirmed") {
        setCurrentStep("content");
      } else if (campaign.status === "subject_defined") {
        setCurrentStep("confirm_subject");
      } else if (campaign.listId) {
        setCurrentStep("subject");
      }
    }
  }, [campaign]);

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: (result) => {
      setCampaignId(result.id);
      toast.success("Campanha criada");
    },
    onError: (err) => toast.error(err.message),
  });

  const selectListMutation = trpc.campaigns.selectList.useMutation({
    onSuccess: () => {
      toast.success("Lista selecionada");
      setCurrentStep("subject");
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  const defineSubjectMutation = trpc.campaigns.defineSubject.useMutation({
    onSuccess: () => {
      toast.success("Assunto definido");
      setCurrentStep("confirm_subject");
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmSubjectMutation = trpc.campaigns.confirmSubject.useMutation({
    onSuccess: () => {
      toast.success("Assunto confirmado com sucesso");
      setCurrentStep("content");
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  const setContentMutation = trpc.campaigns.setContent.useMutation({
    onSuccess: () => {
      toast.success("Conteúdo salvo");
      setCurrentStep("test");
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImageMutation = trpc.campaigns.uploadImage.useMutation({
    onSuccess: (result) => {
      setImageUrl(result.url);
      toast.success("Imagem enviada");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadAttachmentMutation = trpc.campaigns.uploadAttachment.useMutation({
    onSuccess: (result) => {
      setAttachments(prev => [...prev, result]);
      toast.success("Anexo adicionado");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAttachmentMutation = trpc.campaigns.deleteAttachment.useMutation({
    onSuccess: (_, vars) => {
      setAttachments(prev => prev.filter(a => a.id !== vars.id));
      toast.success("Anexo removido");
    },
  });

  const sendTestMutation = trpc.campaigns.sendTest.useMutation({
    onSuccess: (result) => {
      toast.success(`E-mail de teste enviado para ${result.sentTo}`);
      setCurrentStep("send");
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendCampaignMutation = trpc.campaigns.sendCampaign.useMutation({
    onSuccess: (result) => {
      toast.success(`Campanha enviada para ${result.recipientCount} destinatários`);
      utils.campaigns.list.invalidate();
      utils.dashboard.stats.invalidate();
      refetchCampaign();
    },
    onError: (err) => toast.error(err.message),
  });

  // Memoize sanitized HTML for preview to avoid re-sanitizing on every render
  const sanitizedPreviewHtml = useMemo(() => {
    if (!htmlContent) return "";
    return sanitizeHtmlForPreview(htmlContent);
  }, [htmlContent]);

  const handleCreateAndSelectList = () => {
    if (!campaignId) {
      if (!campaignName.trim()) { toast.error("Informe o nome da campanha"); return; }
      createMutation.mutate({ name: campaignName, listId: selectedListId ? parseInt(selectedListId) : undefined }, {
        onSuccess: (result) => {
          if (selectedListId) {
            selectListMutation.mutate({ campaignId: result.id, listId: parseInt(selectedListId) });
          }
        },
      });
    } else {
      if (!selectedListId) { toast.error("Selecione uma lista"); return; }
      selectListMutation.mutate({ campaignId, listId: parseInt(selectedListId) });
    }
  };

  const handleDefineSubject = () => {
    if (!campaignId || !subject.trim()) { toast.error("Informe o assunto"); return; }
    defineSubjectMutation.mutate({
      campaignId,
      subject,
      previewText: previewText || undefined,
      senderName: senderName || undefined,
      senderEmail: senderEmail || undefined,
    });
  };

  const handleConfirmSubject = () => {
    if (!campaignId || !confirmedSubject.trim()) { toast.error("Confirme o assunto"); return; }
    confirmSubjectMutation.mutate({ campaignId, confirmedSubject });
  };

  const handleSetContent = () => {
    if (!campaignId) return;
    if (contentType === "html" && !htmlContent.trim()) { toast.error("Informe o conteúdo HTML"); return; }
    if (contentType === "image" && !imageUrl) { toast.error("Envie uma imagem"); return; }

    // Sanitize HTML before sending to server
    const cleanHtml = contentType === "html" ? sanitizeHtmlForSend(htmlContent) : undefined;

    // Validate size before sending
    if (cleanHtml) {
      const validation = validateHtmlSize(cleanHtml);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
    }

    setContentMutation.mutate({
      campaignId,
      contentType,
      htmlContent: cleanHtml,
      imageUrl: contentType === "image" ? imageUrl : undefined,
    });
  };

  const handleHtmlFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Validate file size before reading
    if (file.size > HTML_SIZE_LIMITS.MAX_SIZE_BYTES) {
      toast.error(`O arquivo é muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O tamanho máximo é ${HTML_SIZE_LIMITS.MAX_SIZE_LABEL}.`);
      return;
    }

    setHtmlImporting(true);
    setSanitizationInfo(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawHtml = reader.result as string;

        // Validate size
        const validation = validateHtmlSize(rawHtml);
        if (!validation.valid) {
          toast.error(validation.message);
          setHtmlImporting(false);
          return;
        }

        // Count dangerous elements before sanitization
        const dangerous = countDangerousElements(rawHtml);

        // Set the raw HTML (preview will be sanitized via useMemo)
        setHtmlContent(rawHtml);

        // Show feedback
        if (dangerous.total > 0) {
          setSanitizationInfo({
            removed: dangerous.total,
            sizeFormatted: validation.sizeFormatted,
          });
          toast.success(
            `Arquivo "${file.name}" importado (${validation.sizeFormatted}). ${dangerous.total} elemento(s) perigoso(s) serão removidos no preview e envio.`,
            { duration: 5000 }
          );
        } else {
          setSanitizationInfo({
            removed: 0,
            sizeFormatted: validation.sizeFormatted,
          });
          toast.success(`Arquivo "${file.name}" carregado com sucesso (${validation.sizeFormatted})`);
        }
      } catch (err) {
        toast.error("Erro ao processar o arquivo HTML");
      } finally {
        setHtmlImporting(false);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo");
      setHtmlImporting(false);
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Apenas PNG e JPEG são suportados");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        campaignId: campaignId!,
        fileName: file.name,
        base64Data: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAttachmentMutation.mutate({
        campaignId: campaignId!,
        fileName: file.name,
        base64Data: base64,
        mimeType: file.type,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const isSent = campaign?.status === "sent" || campaign?.status === "sending";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {editId ? (isSent ? "Detalhes da Campanha" : "Editar Campanha") : "Nova Campanha"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Siga os passos para configurar e enviar sua campanha.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const isActive = step.key === currentStep;
          const isCompleted = i < currentStepIndex;
          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => {
                  if (isCompleted && !isSent) setCurrentStep(step.key);
                }}
                disabled={!isCompleted && !isActive}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  isActive ? "bg-primary text-primary-foreground font-medium" :
                  isCompleted ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select List */}
      {currentStep === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Destinatários
            </CardTitle>
            <CardDescription>Defina o nome da campanha e selecione a lista de destinatários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da campanha *</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Newsletter Março 2026" disabled={!!campaignId} />
            </div>
            <div>
              <Label>Lista de destinatários *</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma lista" /></SelectTrigger>
                <SelectContent>
                  {lists?.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                      {list.name} ({list.contactCount} contatos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!lists || lists.length === 0) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Nenhuma lista encontrada. <button className="text-primary underline" onClick={() => setLocation("/lists")}>Crie uma lista</button> primeiro.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateAndSelectList} disabled={createMutation.isPending || selectListMutation.isPending} className="gap-2">
                {(createMutation.isPending || selectListMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Define Subject */}
      {currentStep === "subject" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Assunto
            </CardTitle>
            <CardDescription>Defina o assunto e as informações do remetente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assunto do e-mail *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Novidades da Real 94 - Março 2026" />
            </div>
            <div>
              <Label>Texto de pré-visualização</Label>
              <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Texto que aparece na caixa de entrada" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do remetente</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Real 94" />
              </div>
              <div>
                <Label>E-mail do remetente</Label>
                <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="contato@real94.com.br" type="email" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("list")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleDefineSubject} disabled={defineSubjectMutation.isPending} className="gap-2">
                {defineSubjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm Subject (double validation) */}
      {currentStep === "confirm_subject" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Assunto
            </CardTitle>
            <CardDescription>
              Por segurança, digite novamente o assunto para confirmar. Isso evita erros no envio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">Assunto definido:</p>
              <p className="font-medium text-lg mt-1">{campaign?.subject || subject}</p>
            </div>
            <div>
              <Label>Digite o assunto novamente para confirmar *</Label>
              <Input
                value={confirmedSubject}
                onChange={(e) => setConfirmedSubject(e.target.value)}
                placeholder="Redigite o assunto exatamente como acima"
              />
              {confirmedSubject && confirmedSubject !== (campaign?.subject || subject) && (
                <p className="text-xs text-destructive mt-1">O assunto não corresponde. Verifique e tente novamente.</p>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("subject")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleConfirmSubject} disabled={confirmSubjectMutation.isPending || confirmedSubject !== (campaign?.subject || subject)} className="gap-2">
                {confirmSubjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar <Check className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Content */}
      {currentStep === "content" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Conteúdo do E-mail
            </CardTitle>
            <CardDescription>Defina o corpo do e-mail e adicione anexos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Button variant={contentType === "html" ? "default" : "outline"} onClick={() => setContentType("html")} className="gap-2">
                <Code className="h-4 w-4" /> HTML
              </Button>
              <Button variant={contentType === "image" ? "default" : "outline"} onClick={() => setContentType("image")} className="gap-2">
                <Image className="h-4 w-4" /> Imagem
              </Button>
            </div>

            {contentType === "html" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={handleHtmlFileImport}
                    className="hidden"
                    id="html-file-upload"
                    disabled={htmlImporting}
                  />
                  <label
                    htmlFor="html-file-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all text-sm font-medium text-primary ${htmlImporting ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {htmlImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    {htmlImporting ? "Processando..." : "Importar arquivo HTML"}
                  </label>
                  {htmlContent && !htmlImporting && (
                    <Button variant="ghost" size="sm" onClick={() => { setHtmlContent(""); setSanitizationInfo(null); toast.info("Conteúdo HTML limpo"); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Limpar
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Máx. {HTML_SIZE_LIMITS.MAX_SIZE_LABEL}
                  </span>
                </div>

                {/* Sanitization info badge */}
                {sanitizationInfo && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                    sanitizationInfo.removed > 0
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-green-50 border-green-200 text-green-800"
                  }`}>
                    {sanitizationInfo.removed > 0 ? (
                      <>
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>
                          <strong>{sanitizationInfo.removed}</strong> elemento(s) perigoso(s) detectado(s) (scripts, iframes, etc.).
                          Eles serão automaticamente removidos no preview e no envio para garantir a segurança.
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>HTML seguro ({sanitizationInfo.sizeFormatted}). Nenhum elemento perigoso detectado.</span>
                      </>
                    )}
                  </div>
                )}

                <div className="relative">
                  <Label className="text-sm">Código HTML do e-mail {htmlContent ? "(editável)" : ""}</Label>
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => {
                      setHtmlContent(e.target.value);
                      setSanitizationInfo(null);
                    }}
                    placeholder="Cole ou importe o código HTML do e-mail aqui..."
                    rows={12}
                    className="font-mono text-sm mt-1.5"
                  />
                </div>

                {htmlContent && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Pré-visualização segura (scripts e iframes removidos):
                    </Label>
                    <div className="mt-1 border rounded-lg bg-white shadow-inner" style={{ height: 400 }}>
                      <iframe
                        srcDoc={sanitizedPreviewHtml}
                        sandbox=""
                        title="Pré-visualização do e-mail"
                        className="w-full h-full border-0 rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label>Imagem do corpo do e-mail (PNG/JPEG)</Label>
                <div className="mt-2">
                  <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleImageUpload} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm">
                    <Upload className="h-4 w-4" />
                    {uploadImageMutation.isPending ? "Enviando..." : "Selecionar imagem"}
                  </label>
                </div>
                {imageUrl && (
                  <div className="mt-3 border rounded-lg p-2 bg-white">
                    <img src={imageUrl} alt="Corpo do e-mail" className="max-w-full max-h-64 mx-auto" />
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div>
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Anexos
              </Label>
              <div className="mt-2">
                <input type="file" onChange={handleAttachmentUpload} className="hidden" id="attachment-upload" />
                <label htmlFor="attachment-upload" className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadAttachmentMutation.isPending ? "Enviando..." : "Adicionar anexo"}
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate">{att.fileName}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAttachmentMutation.mutate({ id: att.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("confirm_subject")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleSetContent} disabled={setContentMutation.isPending || htmlImporting} className="gap-2">
                {setContentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Test (Homologation) */}
      {currentStep === "test" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Homologação - E-mail de Teste
            </CardTitle>
            <CardDescription>
              Antes do envio final, é obrigatório enviar um e-mail de teste para o seu endereço cadastrado.
              Verifique se o conteúdo está correto antes de prosseguir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">Envio de teste obrigatório</p>
                  <p className="text-xs text-amber-700 mt-1">
                    O e-mail de teste será enviado para o endereço do seu perfil. Verifique sua caixa de entrada antes de confirmar o envio final.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assunto:</span>
                <span className="font-medium">{campaign?.subject}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo de conteúdo:</span>
                <span className="font-medium">{campaign?.contentType === "html" ? "HTML" : "Imagem"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anexos:</span>
                <span className="font-medium">{attachments.length}</span>
              </div>
            </div>

            {campaign?.testSentAt && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 text-sm">Teste enviado com sucesso</p>
                    <p className="text-xs text-green-700">
                      Enviado para {campaign.testSentTo} em {new Date(campaign.testSentAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("content")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { if (campaignId) sendTestMutation.mutate({ campaignId }); }}
                  disabled={sendTestMutation.isPending}
                  className="gap-2"
                >
                  {sendTestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar teste
                </Button>
                {campaign?.testSentAt && (
                  <Button onClick={() => setCurrentStep("send")} className="gap-2">
                    Próximo <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Final Send */}
      {currentStep === "send" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Confirmar e Enviar
            </CardTitle>
            <CardDescription>Revise os detalhes da campanha antes do envio final.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <InfoRow label="Campanha" value={campaign?.name || campaignName} />
              <InfoRow label="Assunto" value={campaign?.subject || subject} />
              <InfoRow label="Destinatários" value={`${campaign?.recipientCount ?? 0} contatos`} />
              <InfoRow label="Conteúdo" value={campaign?.contentType === "html" ? "HTML" : "Imagem"} />
              <InfoRow label="Anexos" value={`${attachments.length} arquivo(s)`} />
              <InfoRow label="Teste enviado" value={campaign?.testSentAt ? `Sim - ${new Date(campaign.testSentAt).toLocaleString("pt-BR")}` : "Não"} />
            </div>

            {isSent && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 text-sm">
                      {campaign?.status === "sending" ? "Campanha sendo enviada..." : "Campanha enviada com sucesso"}
                    </p>
                    {campaign?.sentAt && (
                      <p className="text-xs text-green-700">
                        {campaign.sentCount} enviados, {campaign.failedCount} falhas - {new Date(campaign.sentAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => isSent ? setLocation("/campaigns") : setCurrentStep("test")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {isSent ? "Voltar às campanhas" : "Voltar"}
              </Button>
              {!isSent && (
                <Button
                  onClick={() => {
                    if (campaignId && confirm("Tem certeza que deseja enviar esta campanha? Esta ação não pode ser desfeita.")) {
                      sendCampaignMutation.mutate({ campaignId });
                    }
                  }}
                  disabled={sendCampaignMutation.isPending}
                  className="gap-2"
                >
                  {sendCampaignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar campanha
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right max-w-xs truncate">{value}</span>
    </div>
  );
}
