import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Nominations from "./pages/Nominations";
import NominationDetail from "./pages/NominationDetail";
import Submit from "./pages/Submit";
import Approval from "./pages/Approval";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/nominations" element={
              <ProtectedRoute>
                <Nominations />
              </ProtectedRoute>
            } />
            <Route path="/nominations/:id" element={
              <ProtectedRoute>
                <NominationDetail />
              </ProtectedRoute>
            } />
            <Route path="/submit" element={
              <ProtectedRoute requiredRoles={['student']}>
                <Submit />
              </ProtectedRoute>
            } />
            <Route path="/approval" element={
              <ProtectedRoute requiredRoles={[
                'department_head', 'associate_dean', 'dean', 
                'student_affairs', 'committee_member', 
                'committee_chairman', 'president', 'system_admin'
              ]}>
                <Approval />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
