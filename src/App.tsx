/* Main App Component - Handles routing, auth provider and layout */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Pages
import Index from '@/pages/Index'
import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import LeadsList from '@/pages/LeadsList'
import LeadForm from '@/pages/LeadForm'
import LeadDetail from '@/pages/LeadDetail'
import FunilVendas from '@/pages/FunilVendas'
import KitsSolares from '@/pages/KitsSolares'
import Equipe from '@/pages/Equipe'
import WhatsAppPage from '@/pages/WhatsApp'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* Protected CRM Routes inside Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/leads/novo" element={<LeadForm />} />
            <Route path="/leads/:id/editar" element={<LeadForm />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/funil" element={<FunilVendas />} />
            <Route path="/kits" element={<KitsSolares />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />

            {/* Admin-only Equipe Route */}
            <Route
              path="/equipe"
              element={
                <ProtectedRoute adminOnly>
                  <Equipe />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
