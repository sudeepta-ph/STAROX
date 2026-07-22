import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider, AuthenticateWithRedirectCallback, useUser } from "@clerk/clerk-react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/lib/authStore";
import AuthModal from "@/components/AuthModal";

// Public Pages
import StaroxIntelligence from "@/pages/StaroxIntelligence";
import ComingSoon from "@/pages/ComingSoon";
import Index from "@/pages/Index";
import AgentPage from "@/pages/AgentPage";
import Agents from "@/pages/Agents";
import Projects from "@/pages/Projects";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import Help from "@/pages/Help";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Privacy from "@/pages/Privacy";
import Teams from "@/pages/Teams";
import TeamsEdits from "@/pages/TeamsEdits";
import TeamsTeamX from "@/pages/TeamsTeamX";
import NotFound from "@/pages/NotFound";
import Analytics from "@/pages/Analytics";
import Connectors from "@/pages/Connectors";

// Blog Pages
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlogDashboard from "./pages/AdminBlogDashboard";
import AdminBlogEditor from "./pages/AdminBlogEditor";
import AdminMediaLibrary from "./pages/AdminMediaLibrary";

// PMX Pages
import PmxLayout from "@/components/pmx/PmxLayout";
import PmxOverview from "@/pages/pmx/PmxOverview";
import PmxSources from "@/pages/pmx/PmxSources";
import PmxEvidence from "@/pages/pmx/PmxEvidence";
import PmxAnalysis from "@/pages/pmx/PmxAnalysis";
import PmxProblems from "@/pages/pmx/PmxProblems";
import PmxOpportunities from "@/pages/pmx/PmxOpportunities";
import PmxDecisions from "@/pages/pmx/PmxDecisions";
import PmxSolutions from "@/pages/pmx/PmxSolutions";
import PmxExecution from "@/pages/pmx/PmxExecution";
import PmxArtifacts from "@/pages/pmx/PmxArtifacts";
import PmxHistory from "@/pages/pmx/PmxHistory";
import PmxSettings from "@/pages/pmx/PmxSettings";
import PmxDocs from "@/pages/pmx/PmxDocs";

const CLERK_PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables.");
}

// Helper component to sync Clerk Auth state and fetch role from Supabase DB
function ClerkAuthSync() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }

    const syncUserSession = async () => {
      if (isSignedIn && clerkUser) {
        let userRole = "user";
        try {
          const token = await (window as any).Clerk?.session?.getToken();
          const res = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const profile = await res.json();
            userRole = profile.role || "user";
          }
        } catch (err) {
          console.error("[ClerkAuthSync] Profile fetch error:", err);
        }

        setUser({
          uid: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || null,
          displayName: clerkUser.fullName || clerkUser.username || null,
          photoURL: clerkUser.imageUrl || null,
          role: userRole
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    syncUserSession();
  }, [isLoaded, isSignedIn, clerkUser, setUser, setLoading]);

  return null;
}

// Authentication route protector
function ProtectedRoute() {
  const { user, loading } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm font-medium animate-pulse">Checking credentials...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-background relative overflow-hidden flex items-center justify-center font-sans">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_65%_at_5%_0%,rgba(90,189,255,0.06)_0%,transparent_50%)]" />
        <div className="text-center space-y-4 max-w-sm px-6 relative z-10">
          <img src="/strx.png" alt="STAROX Logo" className="h-10 w-10 mx-auto object-contain drop-shadow-[0_0_8px_rgba(102,214,255,0.5)]" />
          <h2 className="text-lg font-bold text-white font-display">Authentication Required</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please sign in to access the STAROX Intelligence workspace and strategic tools.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2 text-xs hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(14,165,233,0.25)]"
          >
            Sign In / Sign Up
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => navigate("/starox-intelligence")} />
      </div>
    );
  }

  return <Outlet />;
}

// Admin authorization route protector
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm font-medium animate-pulse">Checking authorization...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/blog?denied=true" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkAuthSync />
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="starox-theme">
        <BrowserRouter>
          <Routes>
            {/* Public Callback */}
            <Route
              path="/sso-callback"
              element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />}
            />
            
            {/* Public Blog Routes */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />

            {/* Public Pages */}
            <Route path="/" element={<Navigate to="/starox-intelligence" replace />} />
            <Route path="/dashboard" element={<Navigate to="/starox-intelligence" replace />} />
            <Route path="/starox-intelligence" element={<StaroxIntelligence />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/help" element={<Help />} />

            {/* Protected Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/teams" element={<Teams />} />
              <Route path="/edits" element={<Navigate to="/teams" replace />} />
              <Route path="/product-intelligence" element={<Index />} />
              <Route path="/agent/:agentId" element={<AgentPage />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Protected Admin Blog Routes */}
              <Route path="/admin/blog" element={<AdminRoute><AdminBlogDashboard /></AdminRoute>} />
              <Route path="/admin/blog/new" element={<AdminRoute><AdminBlogEditor /></AdminRoute>} />
              <Route path="/admin/blog/edit/:id" element={<AdminRoute><AdminBlogEditor /></AdminRoute>} />
              <Route path="/admin/blog/media" element={<AdminRoute><AdminMediaLibrary /></AdminRoute>} />

              {/* STAROX PMX Module Nested Routes */}
              <Route path="/pmx" element={<PmxLayout />}>
                <Route index element={<Navigate to="/pmx/overview" replace />} />
                <Route path="overview" element={<PmxOverview />} />
                <Route path="sources" element={<PmxSources />} />
                <Route path="evidence" element={<PmxEvidence />} />
                <Route path="analysis" element={<PmxAnalysis />} />
                <Route path="problems" element={<PmxProblems />} />
                <Route path="opportunities" element={<PmxOpportunities />} />
                <Route path="decisions" element={<PmxDecisions />} />
                <Route path="solutions" element={<PmxSolutions />} />
                <Route path="execution" element={<PmxExecution />} />
                <Route path="artifacts" element={<PmxArtifacts />} />
                <Route path="history" element={<PmxHistory />} />
                <Route path="settings" element={<PmxSettings />} />
                <Route path="docs" element={<PmxDocs />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </ClerkProvider>
  );
}

