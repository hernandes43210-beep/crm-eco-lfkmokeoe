import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  GitBranch,
  FileText,
  Boxes,
  MessageSquare,
  ShieldCheck,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Webhook,
  KeyRound,
  Inbox,
} from 'lucide-react'
import officialLogoPng from '@/assets/a-613c6.png'
import EcosolarLogo from '@/components/EcosolarLogo'
import { useAuth } from '@/context/AuthContext'
import { NotificationBell } from '@/components/NotificationBell'
import { LeadsService } from '@/services/leads'
import useRealtime from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [countAguardando, setCountAguardando] = useState(0)

  const refreshCountAguardando = useCallback(async () => {
    try {
      const c = await LeadsService.countAguardandoQualificacao()
      setCountAguardando(c)
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    refreshCountAguardando()
  }, [refreshCountAguardando])

  useRealtime('leads', () => {
    refreshCountAguardando()
  })

  // Navigation Items
  const navItems = [
    { label: 'Painel', path: '/', icon: LayoutDashboard },
    {
      label: 'Leads',
      path: '/leads',
      icon: Users,
      badge: countAguardando > 0 ? countAguardando : undefined,
    },
    { label: 'Importar Leads', path: '/leads/importar', icon: FileSpreadsheet },
    { label: 'Funil de Vendas', path: '/funil', icon: GitBranch },
    { label: 'Propostas', path: '/propostas', icon: FileText },
    { label: 'Kits Solares', path: '/kits', icon: Boxes },
    { label: 'WhatsApp', path: '/whatsapp', icon: MessageSquare },
    ...(isAdmin
      ? [
          { label: 'Integrações', path: '/integracoes', icon: Webhook },
          { label: 'Equipe', path: '/equipe', icon: ShieldCheck },
        ]
      : []),
  ]

  // Page title mapping based on current pathname
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Painel Comercial'
    if (path === '/leads') return 'Gestão de Leads'
    if (path === '/leads/novo') return 'Novo Lead'
    if (path === '/leads/importar') return 'Importar Leads (Planilha Luvik)'
    if (path.startsWith('/leads/') && path.endsWith('/editar')) return 'Editar Lead'
    if (path.startsWith('/leads/')) return 'Detalhes do Lead'
    if (path === '/funil') return 'Funil de Vendas Solar'
    if (path === '/propostas') return 'Gestão de Propostas Comerciais'
    if (path === '/kits') return 'Catálogo de Kits Solares'
    if (path === '/whatsapp') return 'WhatsApp & Atendimento Solar'
    if (path === '/integracoes') return 'Integrações & Webhooks (Luvik)'
    if (path === '/equipe') return 'Membros da Equipe'
    return 'Ecosolar Energy'
  }

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'EE'
  }

  const NavLinks = ({ onClickItem }: { onClickItem?: () => void }) => (
    <nav className="flex-1 space-y-1.5 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClickItem}
            className={cn(
              'group flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-[#0B7A5B] text-white shadow-sm shadow-[#0B7A5B]/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-transform duration-150 group-hover:scale-110',
                isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-200',
              )}
            />
            <span>{item.label}</span>
            {item.badge ? (
              <span
                title={`${item.badge} lead(s) aguardando qualificação`}
                className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse"
              >
                {item.badge}
              </span>
            ) : isActive ? (
              <ChevronRight className="w-4 h-4 ml-auto text-emerald-200/70" />
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )

  const UserSection = ({ onOpenChangePassword }: { onOpenChangePassword?: () => void }) => (
    <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-700/80 border border-emerald-500/30 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
          {getInitials(user?.name, user?.email)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">
            {user?.name || 'Vendedor'}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-xs text-slate-400 truncate">
              {user?.role || 'Membro'} • {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (onOpenChangePassword) onOpenChangePassword()
            setChangePasswordOpen(true)
          }}
          className="flex-1 justify-start text-xs text-slate-300 hover:text-white hover:bg-slate-800/90 h-8 px-2.5 gap-2"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Alterar senha</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="Sair do sistema"
          className="text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 h-8 w-8 shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900">
      {/* Desktop Sidebar (Fixed 260px, Navy #0F172A) */}
      <aside className="hidden md:flex w-[260px] flex-col fixed inset-y-0 left-0 bg-[#0F172A] border-r border-slate-800 z-30 select-none">
        {/* Brand / Logo */}
        <div className="h-18 flex items-center justify-between px-4 py-3 border-b border-slate-800/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white rounded-xl p-1 shadow-md shadow-black/30 flex items-center justify-center shrink-0 border border-white/20">
              <img
                src={officialLogoPng}
                alt="Ecosolar Energy Logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="font-black text-[15px] text-white tracking-tight">ECO</span>
                <span className="font-black text-[15px] text-[#F5C518] tracking-tight border-b-2 border-[#F5C518] pb-0.5">
                  SOLAR
                </span>
                <span className="font-black text-[15px] text-white tracking-tight ml-0.5">
                  ENERGY
                </span>
              </div>
              <p className="text-[10px] text-slate-300 tracking-wider font-semibold truncate mt-1 uppercase">
                A ENERGIA DO FUTURO, HOJE!
              </p>
            </div>
          </div>

          {/* Sino de Notificações na Sidebar Desktop */}
          <div className="shrink-0 pl-1">
            <NotificationBell side="right" align="start" />
          </div>
        </div>

        {/* Links */}
        <NavLinks />

        {/* User Footer */}
        <UserSection />
      </aside>

      {/* Main Container */}
      <div className="flex-1 md:pl-[260px] flex flex-col min-h-screen min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sino também acessível na topbar mobile/desktop para conveniência */}
            <div className="md:hidden">
              <NotificationBell side="bottom" align="end" />
            </div>

            <Button
              onClick={() => navigate('/leads/novo')}
              className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium shadow-sm shadow-[#0B7A5B]/30 flex items-center gap-1.5 h-9.5 px-4 rounded-lg"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Lead</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto animate-fade-in-up">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] bg-[#0F172A] border-r-slate-800 text-white flex flex-col"
        >
          <SheetHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white rounded-lg p-1 shadow-sm flex items-center justify-center shrink-0 border border-white/20">
                <img
                  src={officialLogoPng}
                  alt="Ecosolar Energy Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-white font-bold text-base leading-tight">
                  <span className="font-black text-white">ECO</span>
                  <span className="font-black text-[#F5C518] border-b border-[#F5C518]">
                    SOLAR
                  </span>{' '}
                  <span className="font-black text-white">ENERGY</span>
                </SheetTitle>
                <p className="text-[10px] text-slate-300 font-semibold truncate uppercase mt-0.5">
                  A ENERGIA DO FUTURO, HOJE!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell side="bottom" align="end" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileDrawerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </SheetHeader>

          <NavLinks onClickItem={() => setMobileDrawerOpen(false)} />

          <UserSection onOpenChangePassword={() => setMobileDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Modal de Alteração de Senha do Usuário */}
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  )
}
