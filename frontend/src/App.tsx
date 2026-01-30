import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import BuyerLayout from "@/components/layout/BuyerLayout";
import SellerLayout from "@/components/layout/SellerLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import MarketplacePage from "@/pages/MarketplacePage";
import MarketplaceDetailPage from "@/pages/MarketplaceDetailPage";
import NotFound from "@/pages/NotFound";

// Buyer Pages
import BuyerDashboard from "@/pages/buyer/BuyerDashboard";
import BuyerOnboarding from "@/pages/buyer/BuyerOnboarding";

// Seller Pages
import SellerDashboard from "@/pages/seller/SellerDashboard";
import SellerOnboarding from "@/pages/seller/SellerOnboarding";
import CreateProject from "@/pages/seller/CreateProject";
import NFTMinting from "@/pages/seller/NFTMinting";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes with MainLayout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/:id" element={<MarketplaceDetailPage />} />
            </Route>

            {/* Auth page (no layout) */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Buyer routes */}
            <Route path="/buyer" element={<BuyerLayout />}>
              <Route index element={<BuyerDashboard />} />
              <Route path="onboarding" element={<BuyerOnboarding />} />
            </Route>

            {/* Seller routes */}
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="onboarding" element={<SellerOnboarding />} />
              <Route path="projects/new" element={<CreateProject />} />
              <Route path="nfts" element={<NFTMinting />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </WalletProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
