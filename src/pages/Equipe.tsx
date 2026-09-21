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
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
} from 'lucide-react'
import { EquipeService } from '@/services/equipe'
import { useAuth } from '@/context/AuthContext'
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
  const { isAdmin } = useAuth()
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
  const [inviteEmailResult, setInviteEmailResult] = useState<{
    status: 'sucesso' | 'erro' | 'duplicado_ignorado'
    mensagem: string
    destinatario: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null)

  // Admin Reset Password State
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null)
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false)
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false)
  const [isAdminResetting, setIsAdminResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Edit Cidade de Atuação & Telefone State
  const [cidadeTargetUser, setCidadeTargetUser] = useState<User | null>(null)
  const [cidadeAtuacaoInput, setCidadeAtuacaoInput] = useState('')
  const [telefoneInput, setTelefoneInput] = useState('')
  const [isSavingCidade, setIsSavingCidade] = useState(false)

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
    setInviteEmailResult(null)
    setCopiedCode(false)
    setIsInviteModalOpen(true)
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = inviteEmail.trim().toLowerCase() || 'ecosolarenergy2022@gmail.com'
    const code = generatedCode.trim().toUpperCase()
    if (!code) return

    try {
      setIsSubmitting(true)
      const result = await EquipeService.createInvite({
        nome: inviteName.trim(),
        email: targetEmail,
        role: inviteRole,
        codigo_convite: code,
      })

      setCreatedInviteCode(code)
      setInviteEmailResult({
        status: result.email_status,
        mensagem: result.email_mensagem,
        destinatario: targetEmail,
      })

      if (result.email_status === 'sucesso') {
        toast({
          title: 'Convite criado e e-mail enviado!',
          description: `E-mail de convite enviado para ${targetEmail}. Código: ${code}.`,
        })
      } else if (result.email_status === 'duplicado_ignorado') {
        toast({
          title: 'Convite atualizado!',
          description: `O código foi gerado. O e-mail já havia sido disparado anteriormente para ${targetEmail}.`,
        })
      } else {
        toast({
          title: 'Convite criado (atenção ao envio do e-mail)',
          description:
            result.email_mensagem ||
            'Não foi possível enviar o e-mail automaticamente. Copie o código para enviar.',
          variant: 'destructive',
        })
      }

      fetchData()
    } catch (err: unknown) {
      console.error('Error creating invite:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao gerar convite.'
      toast({
        title: 'Erro ao criar convite',
        description: msg.includes('unique')
          ? 'Já existe um convite com este código ou e-mail.'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendInviteEmail = async (invite: Convidado) => {
    try {
      setResendingInviteId(invite.id)
      const res = await EquipeService.resendInviteEmail(invite.id)
      if (res.success) {
        toast({
          title: 'E-mail reenviado com sucesso!',
          description: `Novo e-mail de convite enviado para ${invite.email || 'ecosolarenergy2022@gmail.com'}.`,
        })
        fetchData()
      } else {
        toast({
          title: 'Falha no reenvio de e-mail',
          description: res.email_mensagem || 'Não foi possível disparar o e-mail.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      console.error('Error resending invite email:', err)
      toast({
        title: 'Erro ao reenviar e-mail',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setResendingInviteId(null)
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

  const openAdminResetModal = (user: User) => {
    setResetTargetUser(user)
    setAdminNewPassword('')
    setAdminConfirmPassword('')
    setShowAdminNewPassword(false)
    setShowAdminConfirmPassword(false)
    setResetError(null)
  }

  const openEditCidadeModal = (user: User) => {
    setCidadeTargetUser(user)
    setCidadeAtuacaoInput(user.cidade_atuacao || '')
    setTelefoneInput(user.telefone || '')
  }

  const handleSaveCidadeAtuacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cidadeTargetUser) return

    try {
      setIsSavingCidade(true)
      const novaCidade = cidadeAtuacaoInput.trim()
      const novoTelefone = telefoneInput.trim()

      await Promise.all([
        EquipeService.updateUserCidadeAtuacao(cidadeTargetUser.id, novaCidade),
        EquipeService.updateUserTelefone(cidadeTargetUser.id, novoTelefone),
      ])

      toast({
        title: 'Dados do vendedor atualizados!',
        description: `Cidade de atuação e WhatsApp de ${cidadeTargetUser.name || cidadeTargetUser.email} foram salvos com sucesso.`,
      })

      setCidadeTargetUser(null)
      fetchData()
    } catch (err: unknown) {
      console.error('Error updating cidade atuacao:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar cidade de atuação.'
      toast({
        title: 'Erro ao atualizar cidade',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSavingCidade(false)
    }
  }

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)

    if (!resetTargetUser) return

    if (adminNewPassword.length < 8) {
      setResetError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setResetError('A confirmação da nova senha não confere.')
      return
    }

    try {
      setIsAdminResetting(true)
      await EquipeService.adminResetPassword(resetTargetUser.id, adminNewPassword)

      toast({
        title: 'Senha redefinida com sucesso!',
        description: `A nova senha de ${resetTargetUser.name || resetTargetUser.email} foi salva.`,
      })

      setResetTargetUser(null)
    } catch (err: unknown) {
      console.error('Error resetting password by admin:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao redefinir a senha do usuário.'
      setResetError(msg)
      toast({
        title: 'Erro ao redefinir senha',
        description: 'Não foi possível salvar a nova senha do usuário.',
        variant: 'destructive',
      })
    } finally {
      setIsAdminResetting(false)
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
                      <th className="py-3 px-4">Cidade de Atuação</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Membro desde</th>{' '}
                      <th className="py-3 px-4">Status</th>
                      {isAdmin && <th className="py-3 px-4 text-right">Ações</th>}
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

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {usr.cidade_atuacao ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#0B7A5B] border border-emerald-200 text-xs font-semibold">
                                <MapPin className="w-3 h-3 text-[#0B7A5B] shrink-0" />
                                <span className="truncate max-w-[150px]">{usr.cidade_atuacao}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Não definida</span>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditCidadeModal(usr)}
                                className="h-6 w-6 text-slate-400 hover:text-[#0B7A5B] hover:bg-emerald-50"
                                title="Editar cidade e telefone"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-600">
                          {usr.telefone ? (
                            <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {usr.telefone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-400">
                          {formatDateBR(usr.created)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold hover:bg-emerald-100">
                            Ativo
                          </Badge>
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCidadeModal(usr)}
                                className="h-8 text-xs text-slate-700 hover:text-[#0B7A5B] hover:bg-emerald-50 gap-1 font-medium"
                                title={`Editar cidade de ${usr.name || usr.email}`}
                              >
                                <MapPin className="w-3.5 h-3.5 text-[#0B7A5B]" />
                                <span>Cidade</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAdminResetModal(usr)}
                                className="h-8 text-xs text-slate-700 hover:text-[#0B7A5B] hover:bg-emerald-50 gap-1.5 font-medium"
                                title={`Redefinir senha de ${usr.name || usr.email}`}
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                <span>Senha</span>
                              </Button>
                            </div>
                          </td>
                        )}
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
                        <th className="py-3 px-4">E-mail Notificação</th>
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
                            {inv.email_enviado ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 w-fit gap-1">
                                  <Mail className="w-3 h-3 text-emerald-700" />
                                  <span>E-mail enviado</span>
                                </Badge>
                                {inv.email_enviado_em && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {formatDateBR(inv.email_enviado_em)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-medium gap-1"
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span>Pendente / Manual</span>
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={resendingInviteId === inv.id}
                                  onClick={() => handleResendInviteEmail(inv)}
                                  className="h-6 px-1.5 text-[11px] text-[#0B7A5B] hover:text-[#095C44] hover:bg-emerald-50"
                                  title="Enviar e-mail para o convidado agora"
                                >
                                  {resendingInviteId === inv.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Mail className="w-3 h-3" />
                                  )}
                                  <span className="ml-1 text-[10px]">Enviar</span>
                                </Button>
                              </div>
                            )}
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
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <p className="text-xs font-semibold text-emerald-800">
                  Convite criado para{' '}
                  {inviteEmailResult?.destinatario || inviteEmail || 'o colaborador'}!
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

                {/* Email delivery status banner */}
                {inviteEmailResult && (
                  <div
                    className={`p-2.5 rounded-lg text-left text-xs border ${
                      inviteEmailResult.status === 'sucesso'
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                        : inviteEmailResult.status === 'duplicado_ignorado'
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {inviteEmailResult.status === 'sucesso' ? (
                        <Mail className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                      ) : inviteEmailResult.status === 'duplicado_ignorado' ? (
                        <Check className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {inviteEmailResult.status === 'sucesso'
                            ? 'E-mail de convite enviado com sucesso!'
                            : inviteEmailResult.status === 'duplicado_ignorado'
                              ? 'Envio duplicado evitado'
                              : 'Aviso sobre envio de e-mail'}
                        </div>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          {inviteEmailResult.mensagem}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-200/60 text-left space-y-1">
                  <div className="font-semibold text-slate-800">
                    Instruções enviadas ao colaborador:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                    <li>
                      Acessar o link oficial: <code>/cadastro</code>
                    </li>
                    <li>Preencher nome, e-mail e senha</li>
                    <li>
                      Digitar o código de 6 dígitos: <strong>{createdInviteCode}</strong>
                    </li>
                  </ul>
                </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="invEmail" className="text-xs font-semibold text-slate-700">
                    E-mail Corporativo do Convidado
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    Padrão: ecosolarenergy2022@gmail.com se vazio
                  </span>
                </div>
                <Input
                  id="invEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="lucas@empresa.com.br (ou deixe em branco para o e-mail padrão)"
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

      {/* Admin Reset Password Modal */}
      <Dialog
        open={!!resetTargetUser}
        onOpenChange={(open) => {
          if (!open && !isAdminResetting) setResetTargetUser(null)
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 text-[#0B7A5B]">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Redefinir Senha do Usuário
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Como administrador, defina uma nova senha de acesso para{' '}
              <strong className="text-slate-700 font-semibold">
                {resetTargetUser?.name || resetTargetUser?.email}
              </strong>{' '}
              ({resetTargetUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminResetPassword} className="space-y-4 pt-1">
            {resetError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="adminNewPassword" className="text-xs font-semibold text-slate-700">
                  Nova Senha *
                </Label>
                <span className="text-[11px] text-slate-400">Mínimo 8 caracteres</span>
              </div>
              <div className="relative">
                <Input
                  id="adminNewPassword"
                  type={showAdminNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Digite a nova senha para o membro"
                  className="h-9.5 text-sm pr-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showAdminNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showAdminNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="adminConfirmPassword"
                className="text-xs font-semibold text-slate-700"
              >
                Confirmar Nova Senha *
              </Label>
              <div className="relative">
                <Input
                  id="adminConfirmPassword"
                  type={showAdminConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-9.5 text-sm pr-10 border-slate-200 focus-visible:ring-[#0B7A5B]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showAdminConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showAdminConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-tight">
                Após salvar, comunique a nova senha ao colaborador com segurança para que ele possa
                efetuar login.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isAdminResetting}
                onClick={() => setResetTargetUser(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isAdminResetting}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                {isAdminResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Redefinindo...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Salvar nova senha</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Cidade de Atuação */}
      <Dialog
        open={!!cidadeTargetUser}
        onOpenChange={(open) => {
          if (!open && !isSavingCidade) setCidadeTargetUser(null)
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 text-[#0B7A5B]">
              <MapPin className="w-5 h-5 text-[#0B7A5B]" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Cidade de Atuação do Vendedor
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Defina a cidade em que{' '}
              <strong className="text-slate-700 font-semibold">
                {cidadeTargetUser?.name || cidadeTargetUser?.email}
              </strong>{' '}
              atua. Ao entrar um novo lead desta cidade, o vendedor receberá notificação imediata
              por e-mail e no CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCidadeAtuacao} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cidadeAtuacao" className="text-xs font-semibold text-slate-700">
                Cidade(s) de Atuação
              </Label>
              <Input
                id="cidadeAtuacao"
                value={cidadeAtuacaoInput}
                onChange={(e) => setCidadeAtuacaoInput(e.target.value)}
                placeholder="Ex: Seringueiras, São Miguel do Guaporé"
                className="h-10 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A comparação é tolerante (ignora acentos e maiúsculas). Para mais de uma cidade,
                separe por vírgula.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendedorTelefone" className="text-xs font-semibold text-slate-700">
                WhatsApp do Vendedor (com DDD)
              </Label>
              <Input
                id="vendedorTelefone"
                value={telefoneInput}
                onChange={(e) => setTelefoneInput(e.target.value)}
                placeholder="Ex: (69) 99234-6989"
                className="h-10 text-sm border-slate-200 focus-visible:ring-[#0B7A5B]"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                O vendedor receberá alertas de novos leads diretamente em seu WhatsApp pessoal ou
                comercial.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#0B7A5B]" />
                <span>Notificação Automática de Novos Leads (E-mail + WhatsApp)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Sempre que um lead for cadastrado com esta cidade (via formulário, planilha ou
                WhatsApp), este vendedor será avisado no sino do CRM, receberá um e-mail com os
                dados de contato e mensagem no WhatsApp.
              </p>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingCidade}
                onClick={() => setCidadeTargetUser(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingCidade}
                className="bg-[#0B7A5B] hover:bg-[#095C44] text-white text-xs font-semibold gap-1.5"
              >
                {isSavingCidade ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Cidade</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
