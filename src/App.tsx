import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import ProposalEditor from "./pages/ProposalEditor";
import ProposalView from "./pages/ProposalView";
import ProposalAccept from "./pages/ProposalAccept";
import AdhocSign from "./pages/AdhocSign";
import NdaSign from "./pages/NdaSign";
import OnboardingDetail from "./pages/OnboardingDetail";
import OnboardingReportEditor from "./pages/OnboardingReportEditor";
import OnboardingReportView from "./pages/OnboardingReportView";
import OnboardingSignoff from "./pages/OnboardingSignoff";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/proposals/new" element={<ProtectedRoute><ProposalEditor /></ProtectedRoute>} />
            <Route path="/admin/proposals/:id" element={<ProtectedRoute><ProposalEditor /></ProtectedRoute>} />
            <Route path="/p/:slug" element={<ProposalView />} />
            <Route path="/p/:slug/accept" element={<ProposalAccept />} />
            <Route path="/ac/:slug/sign" element={<AdhocSign />} />
            <Route path="/nda/:slug/sign" element={<NdaSign />} />
            <Route path="/onboarding/:id" element={<ProtectedRoute><OnboardingDetail /></ProtectedRoute>} />
            <Route path="/onboarding/:id/report" element={<ProtectedRoute><OnboardingReportEditor /></ProtectedRoute>} />
            <Route path="/onboarding/report/:view_token" element={<OnboardingReportView />} />
            <Route path="/onboarding/signoff/:signoff_token" element={<OnboardingSignoff />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
