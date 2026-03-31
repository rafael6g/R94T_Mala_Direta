import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Informações da sua conta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Dados do Usuário
          </CardTitle>
          <CardDescription>Informações do seu perfil de acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{(user.name || "U").charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-lg font-semibold">{user.name || "Usuário"}</p>
              <Badge variant="outline" className="text-xs mt-1">
                <Shield className="h-3 w-3 mr-1" />
                {user.role === "admin" ? "Administrador" : "Usuário"}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> E-mail
            </Label>
            <Input value={user.email || "Não informado"} readOnly className="mt-1 bg-muted/30" />
          </div>

          <div>
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" /> Membro desde
            </Label>
            <Input value={new Date(user.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} readOnly className="mt-1 bg-muted/30" />
          </div>

          <div>
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" /> Último acesso
            </Label>
            <Input value={new Date(user.lastSignedIn).toLocaleString("pt-BR")} readOnly className="mt-1 bg-muted/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
