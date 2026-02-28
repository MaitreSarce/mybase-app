import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CollectionsPage from "./pages/CollectionsPage";
import InventoryPage from "./pages/InventoryPage";
import WishlistPage from "./pages/WishlistPage";
import ProjectsPage from "./pages/ProjectsPage";
import ContentPage from "./pages/ContentPage";
import PortfolioPage from "./pages/PortfolioPage";
import AlertsPage from "./pages/AlertsPage";
import TagsPage from "./pages/TagsPage";
import MindmapPage from "./pages/MindmapPage";
import CalendarPage from "./pages/CalendarPage";
import Layout from "./components/Layout";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="mindmap" element={<MindmapPage />} />
            <Route path="calendar" element={<CalendarPage />} />
          </Route>
        </Routes>
        <Toaster richColors position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
