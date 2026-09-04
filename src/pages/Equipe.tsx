import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertCircle,
  KeyRound,
  Shield,
  Briefcase,
  Users,
  Loader2,
} from 'lucide-react'
import { EquipeService } from '@/services/equipe'
import type { Convidado, User, UserRole } from '@/types/crm'
import { formatDateBR } from '@/lib/solarUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

export default function Equipe() {
  const [users, setUsers] = useState<User[]>([])
  const [invites, setInvites] = useState<Convidado[]>([])
  const [loading, setLoading] = useState(true)

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('Vendedor')
  const [generatedCode, setGeneratedCode] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const fetchData = async () => {
    try {
      const [allUsers, allInvites] = await Promise.all([
        EquipeService.getTeamMembers(),
        EquipeService.getInvites(),
      ])
      setUsers(allUsers)
      setInvites(allInvites)
    } catch (err) {
      console.error('Error fetching team data:', err)
      toast({
        title: 'Erro ao carregar equipe',
        description: 'Não foi possível carregar os usuários e convites.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Generate 6-char random alphanumeric invite code
  const generateNewInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'SOL'
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const openInviteModal = () => {
    setInviteName('')
    setInviteEmail('')
    setInviteRole('Vendedor')
    setGeneratedCode(generateNewInviteCode())
    setCreatedInviteCode(null)
    setCopiedCode(false)
    setIsInviteModalOpen(true)
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !generatedCode) return

    try {
      setIsSubmitting(true)
      await EquipeService.createInvite({
        nome: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        codigo_convite: generatedCode.trim().toUpperCase(),
      })

      setCreatedInviteCode(generatedCode)
      toast({
        title: 'Convite criado com sucesso!',
        description: `Código ${generatedCode} gerado e pronto para envio.`,
      })
      fetchData()
    } catch (err: unknown) {
      console.error('Error creating invite:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao gerar convite.'
      toast({
        title: 'Erro ao criar convite',
        description: msg.includes('unique') ? 'Já existe um convite para este e-mail.' : msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    toast({
      title: 'Código copiado!',
      description: `Código ${code} copiado para a área de transferência.`,
    })
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleToggleInvite = async (invite: Convidado) => {
    try {
      await EquipeService.toggleInviteStatus(invite.id, invite.ativo)
      toast({
        title: invite.ativo ? 'Convite desativado' : 'Convite reativado',
        description: `O código agora está ${invite.ativo ? 'inativo' : 'ativo'}.`,
      })
      fetchData()
    } catch (err) {
      console.error('Error toggling invite:', err)
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteInvite = async (id: string) => {
    try {
      await EquipeService.deleteInvite(id)
      toast({
        title: 'Convite excluído',
        description: 'O convite foi removido do sistema.',
      })
      fetchData()
    } catch (err) {
      console.error('Error deleting invite:', err)
      toast({
        title: 'Erro ao excluir convite',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-8 select-none animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Gestão de Equipe & Acessos
            </h2>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1 hover:bg-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de usuários ativos, distribuição de papéis comerciais e envio de convites
          </p>
        </div>

        <Button
          onClick={openInviteModal}
          className="bg-[#0B7A5B] hover:bg-[#095C44] text-white font-medium shadow-sm shadow-[#0B7A5B]/30 gap-1.5 h-9.5 px-4 rounded-lg self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Convidar Membro</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-[#0B7A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Carregando dados da equipe...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Members Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0B7A5B]" />
                <span>Membros Ativos ({users.length})</span>
              </h3>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Membro</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Função / Cargo</th>
                      <th className="py-3 px-4">Membro desde</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#0B7A5B] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                              {(usr.name || usr.email).slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate">{usr.name || 'Sem nome cadastrado'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-600 truncate">{usr.email}</td>

                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold gap-1 ${
                              usr.role === 'Admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {usr.role === 'Admin' ? (
                              <Shield className="w-3 h-3" />
                            ) : (
                              <Briefcase className="w-3 h-3" />
                            )}
                            <span>{usr.role || 'Vendedor'}</span>
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-400">
                          {formatDateBR(usr.created)}
                        </td>

                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold hover:bg-emerald-100">
                            Ativo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Invites Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Códigos de Convite Gerados ({invites.length})</span>
              </h3>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              {invites.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum código de convite emitido. Clique em "+ Convidar Membro" para criar um.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Nome Sugerido</th>
                        <th className="py-3 px-4">E-mail Convidado</th>
                        <th className="py-3 px-4">Código de Convite</th>
                        <th className="py-3 px-4">Função</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invites.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                            {inv.nome || '-'}
                          </td>

                          <td className="py-3 px-4 text-xs text-slate-600 truncate">{inv.email}</td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs tracking-wider">
                                {inv.codigo_convite}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyCode(inv.codigo_convite)}
                                className="h-6 w-6 text-slate-400 hover:text-slate-700"
                                title="Copiar código"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${
                                inv.role === 'Admin'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {inv.role}
                            </Badge>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                                inv.ativo
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {inv.ativo ? 'Disponível / Ativo' : 'Utilizado / Inativo'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleInvite(inv)}
                                className="h-7 text-xs text-slate-600 hover:text-slate-900"
                                title={inv.ativo ? 'Desativar convite' : 'Reativar convite'}
                              >
                                {inv.ativo ? 'Desativar' : 'Reativar'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInvite(inv.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Convidar Membro para a Equipe
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gere um código de convite seguro para que o vendedor realize seu autocadastro.
            </DialogDescription>
          </DialogHeader>

          {createdInviteCode ? (
            /* Success & Code display state */
            <div className="space-y-4 py-2 animate-fade-in-up">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <p className="text-xs font-semibold text-emerald-800">
                  Convite criado com sucesso para {inviteEmail}!
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="font-mono text-2xl font-black text-emerald-950 tracking-widest bg-white px-4 py-1.5 rounded-lg border border-emerald-300 shadow-xs">
                    {createdInviteCode}
                  </span>
                  <Button
                    onClick={() => handleCopyCode(createdInviteCode)}
                    className="bg-[#0B7A5B] hover:bg-[#095C44] text-white h-10 px-3 text-xs gap-1.5"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-2">
                  Envie este código ao colaborador. Ele deve acessar a página <code>/cadastro</code>{' '}
                  e inserir o código para criar a senha.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold"
                >
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Invite Creation Form */
            <form onSubmit={handleCreateInvite} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="invNome" className="text-xs font-semibold text-slate-700">
                  Nome do Membro
                </Label>
                <Input
                  id="invNome"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Lucas Ferreira"
                  className="h-9.5 text-sm border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="invEmail" className="text-xs font-semibold text-slate-700">
                  E-mail Corporativo *
                </Label>
                <Input
                  id="invEmail"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="lucas@empresa.com.br"
                  className="h-9.5 text-sm border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="invRole" className="text-xs font-semibold text-slate-700">
                  Função no Sistema *
                </Label>
                <select
                  id="invRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-9.5 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B7A5B]"
                >
                  <option value="Vendedor">Vendedor (Acesso a leads e funil)</option>
                  <option value="Admin">Admin (Acesso total, gestão e kits)</option>
                </select>
              </div>

              <div className="space-y-1 pt-1">
                <Label htmlFor="invCodigo" className="text-xs font-semibold text-slate-700">
                  Código de Convite Sugerido
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invCodigo"
                    value={generatedCode}
                    onChange={(e) => setGeneratedCode(e.target.value.toUpperCase())}
                    className="h-9.5 font-mono font-bold text-sm uppercase bg-slate-50 border-slate-200 tracking-wider"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGeneratedCode(generateNewInviteCode())}
                    className="h-9.5 text-xs text-slate-600 border-slate-200"
                  >
                    Gerar Outro
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando Convite...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Criar Código de Convite</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
