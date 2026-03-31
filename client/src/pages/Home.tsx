import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ClipboardList, Send, Mail, ArrowRight, Plus, Truck } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const statCards = [
    { title: "Contatos", value: stats?.totalContacts ?? 0, icon: Users, color: "text-red-600", bg: "bg-red-50", path: "/contacts" },
    { title: "Listas", value: stats?.totalLists ?? 0, icon: ClipboardList, color: "text-red-700", bg: "bg-red-50/70", path: "/lists" },
    { title: "Campanhas", value: stats?.totalCampaigns ?? 0, icon: Send, color: "text-red-500", bg: "bg-red-50/50", path: "/campaigns" },
    { title: "Enviadas", value: stats?.sentCampaigns ?? 0, icon: Mail, color: "text-red-800", bg: "bg-red-100/50", path: "/campaigns" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {user?.name?.split(" ")[0] || "Usuário"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo à plataforma de mala direta da Real 94.
          </p>
        </div>
        <Button onClick={() => setLocation("/campaigns/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow border"
            onClick={() => setLocation(card.path)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  )}
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Comece a usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActionItem
              number={1}
              title="Adicione seus contatos"
              description="Importe contatos do Excel ou adicione manualmente."
              action="Importar contatos"
              onClick={() => setLocation("/contacts")}
            />
            <ActionItem
              number={2}
              title="Crie sua primeira campanha"
              description="Configure o assunto, conteúdo e envie para sua base."
              action="Criar campanha"
              onClick={() => setLocation("/campaigns/new")}
            />
            <ActionItem
              number={3}
              title="Configure o SMTP"
              description="Defina as credenciais do servidor de e-mail para envio."
              action="Configurar SMTP"
              onClick={() => setLocation("/settings/smtp")}
            />
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction icon={Users} label="Adicionar contato" onClick={() => setLocation("/contacts")} />
            <QuickAction icon={ClipboardList} label="Criar lista" onClick={() => setLocation("/lists")} />
            <QuickAction icon={Send} label="Nova campanha" onClick={() => setLocation("/campaigns/new")} />
            <QuickAction icon={ClipboardList} label="Ver auditoria" onClick={() => setLocation("/audit")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActionItem({ number, title, description, action, onClick }: {
  number: number; title: string; description: string; action: string; onClick: () => void;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClick} className="shrink-0 text-xs gap-1">
        {action}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
    </button>
  );
}
