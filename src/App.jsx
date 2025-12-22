// Root application shell.
// Sets up global providers (tooltips, toasts, React Query) and client-side routing.
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Single shared React Query client for the whole app.
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* TooltipProvider enables Radix / shadcn tooltips across the app */}
    <TooltipProvider>
      {/* shadcn/ui toast system */}
      <Toaster />
      {/* Sonner toast system for transient notifications */}
      <Sonner />

      {/* BrowserRouter handles client-side navigation between pages */}
      <BrowserRouter>
        <Routes>
          {/* Main paint experience */}
          <Route path="/" element={<Index />} />
          {/* Catch-all fallback for unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;