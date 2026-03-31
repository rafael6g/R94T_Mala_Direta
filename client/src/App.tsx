import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Lists = lazy(() => import("./pages/Lists"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignWizard = lazy(() => import("./pages/CampaignWizard"));
const Audit = lazy(() => import("./pages/Audit"));
const SmtpSettings = lazy(() => import("./pages/SmtpSettings"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Login page — outside DashboardLayout (no sidebar, no auth guard) */}
        <Route path="/login" component={Login} />
        {/* All other pages inside DashboardLayout */}
        <Route>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/contacts" component={Contacts} />
                <Route path="/lists" component={Lists} />
                <Route path="/campaigns" component={Campaigns} />
                <Route path="/campaigns/new" component={CampaignWizard} />
                <Route path="/campaigns/:id/edit" component={CampaignWizard} />
                <Route path="/audit" component={Audit} />
                <Route path="/settings/smtp" component={SmtpSettings} />
                <Route path="/profile" component={Profile} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </DashboardLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
