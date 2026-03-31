import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Home,
  Users,
  Mail,
  Send,
  ClipboardList,
  Settings,
  LogOut,
  PanelLeft,
  UserCircle,
  Server,
  Truck,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663174737934/USaXLLhnq7a44vBmyf6RDG/logo-real94_dfb1c1db.webp";

const mainMenuItems = [
  { icon: Home, label: "Início", path: "/" },
];

const crmMenuItems = [
  { icon: Users, label: "Contatos", path: "/contacts" },
  { icon: ClipboardList, label: "Listas", path: "/lists" },
];

const marketingMenuItems = [
  { icon: Send, label: "Campanhas", path: "/campaigns" },
  { icon: Mail, label: "Nova Campanha", path: "/campaigns/new" },
];

const systemMenuItems = [
  { icon: ClipboardList, label: "Auditoria", path: "/audit" },
  { icon: Server, label: "SMTP", path: "/settings/smtp" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen">
        {/* Left panel - Branding */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #2d0a0a 40%, #8b1a1a 100%)" }}>
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 -left-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)" }} />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)" }} />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)" }} />
          </div>
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <img src={LOGO_URL} alt="Real 94" className="h-20 object-contain" />
            </div>

            <div className="flex flex-col gap-8 max-w-lg">
              <div>
                <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
                  Mala Direta
                </h1>
                <div className="h-1 w-16 bg-red-500 rounded-full mt-4" />
              </div>
              <p className="text-lg text-white/70 leading-relaxed">
                Plataforma de e-mail marketing corporativo da Transportadora Real 94. Gerencie contatos, crie campanhas e envie e-mails em massa com total controle e rastreabilidade.
              </p>
              <div className="grid grid-cols-3 gap-6 pt-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-white/90">CRM</span>
                  </div>
                  <span className="text-xs text-white/50">Gestão de contatos e listas</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-white/90">Campanhas</span>
                  </div>
                  <span className="text-xs text-white/50">Wizard de envio em massa</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-white/90">Auditoria</span>
                  </div>
                  <span className="text-xs text-white/50">Logs e rastreabilidade</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Truck className="h-3.5 w-3.5" />
              <span>Transportadora Real 94 &mdash; Tecnologia e Logística</span>
            </div>
          </div>
        </div>

        {/* Right panel - Login */}
        <div className="flex-1 flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm flex flex-col gap-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center gap-4">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
                <img src={LOGO_URL} alt="Real 94" className="h-16 object-contain" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-muted-foreground">
                Acesse sua conta para gerenciar campanhas de e-mail.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
                size="lg"
                className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
              >
                <Mail className="h-5 w-5" />
                Entrar na plataforma
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">acesso seguro</span>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Importe seus contatos</p>
                      <p className="text-xs text-muted-foreground">Cole dados do Excel ou adicione manualmente</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Crie sua campanha</p>
                      <p className="text-xs text-muted-foreground">Wizard guiado com validação dupla</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Envie com segurança</p>
                      <p className="text-xs text-muted-foreground">Teste antes e acompanhe os resultados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Ao entrar, você concorda com os termos de uso da plataforma.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const allItems = [...mainMenuItems, ...crmMenuItems, ...marketingMenuItems, ...systemMenuItems];
  const activeMenuItem = allItems.find(item => {
    if (item.path === "/") return location === "/";
    return location.startsWith(item.path);
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const renderMenuItems = (items: typeof mainMenuItems) =>
    items.map((item) => {
      const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            isActive={isActive}
            onClick={() => setLocation(item.path)}
            tooltip={item.label}
            className="h-9 transition-all font-normal"
          >
            <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <img src={LOGO_URL} alt="Real 94" className="h-10 object-contain" />
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-2">
            <SidebarGroup>
              <SidebarMenu className="px-2">
                {renderMenuItems(mainMenuItems)}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-4">
                CRM
              </SidebarGroupLabel>
              <SidebarMenu className="px-2">
                {renderMenuItems(crmMenuItems)}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-4">
                Marketing
              </SidebarGroupLabel>
              <SidebarMenu className="px-2">
                {renderMenuItems(marketingMenuItems)}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-4">
                Sistema
              </SidebarGroupLabel>
              <SidebarMenu className="px-2">
                {renderMenuItems(systemMenuItems)}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                      {user?.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings/smtp")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações SMTP</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="font-medium text-foreground">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
