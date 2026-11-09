/**
 * Ponte entre a página pública (/proposta/:id) e a camada de dados v2 da proposta.
 * Transforma a PublicProposta carregada do backend no ProposalPDFData que alimenta
 * montarDadosV2 (tela e PDF usam exatamente a mesma fonte de números) e resolve as
 * fotos selecionadas pelo vendedor (lead / institucional / kit IA) em URL + legenda.
 */
import type { PublicProposta } from '@/types/crm'
import type { ProposalPDFData, FotoProposta } from '@/lib/proposalDadosV2'
import { INSTITUTIONAL_INSTALLATION_PHOTOS } from '@/data/socialProofPhotos'

/** Converte a proposta pública no formato consumido por montarDadosV2 / proposalPdf. */
export function proposalDataDePublica(proposta: PublicProposta): ProposalPDFData {
  return {
    id: proposta.id,
    token_publico: proposta.token_publico,
    status: proposta.status,
    kit_nome: proposta.kit_nome,
    kit_potencia_kw: proposta.kit_potencia_kw,
    kit_fabricante: proposta.kit_fabricante,
    custo: proposta.custo,
    margem: proposta.margem,
    preco_venda: proposta.preco_venda,
    desconto_percentual: proposta.desconto_percentual,
    valor_desconto: proposta.valor_desconto,
    valor_bruto: proposta.valor_bruto,
    validade_dias: proposta.validade_dias,
    data_validade: proposta.data_validade,
    condicoes_pagamento: proposta.condicoes_pagamento,
    observacoes: proposta.observacoes,
    data_aceite: proposta.data_aceite,
    aceito_por_nome: proposta.aceito_por_nome,
    created: proposta.created,
    kit_descricao: proposta.kit_descricao || proposta.kit?.descricao,
    kit_string_box: proposta.kit_string_box || proposta.kit?.string_box || undefined,
    kit_marca_painel: proposta.kit_marca_painel || proposta.kit?.marca_painel || undefined,
    kit_marca_inversor: proposta.kit_marca_inversor || proposta.kit?.marca_inversor || undefined,
    kit_qtd_inversores: proposta.kit_qtd_inversores ?? proposta.kit?.qtd_inversores ?? undefined,
    kit_potencia_painel_w:
      proposta.kit_potencia_painel_w || proposta.kit?.potencia_painel_w || undefined,
    kit_potencia_inversor_kw:
      proposta.kit_potencia_inversor_kw || proposta.kit?.potencia_inversor_kw || undefined,
    kit_tipo_estrutura: proposta.kit_tipo_estrutura || proposta.kit?.tipo_estrutura || undefined,
    cliente: {
      nome: proposta.lead?.nome || 'Cliente',
      email: proposta.lead?.email,
      telefone: proposta.lead?.telefone,
      cidade: proposta.lead?.cidade,
      estado: proposta.lead?.estado,
      endereco: proposta.lead?.endereco,
      consumo_mensal_kwh: proposta.lead?.consumo_mensal_kwh,
    },
    vendedor: {
      name: proposta.vendedor?.name || 'Equipe Ecosolar Energy',
      email: proposta.vendedor?.email,
    },
    lead: { consumo_mensal_kwh: proposta.lead?.consumo_mensal_kwh },
    fotos_obra: proposta.fotos_obra,
    fotos_selecionadas: proposta.fotos_selecionadas,
  }
}

/** URL da imagem IA do kit vinculado (quando existir). */
function urlImagemKitIa(proposta: PublicProposta): string {
  return (
    proposta.kit?.imagem_ia_url ||
    (proposta.kit?.imagem_ia && proposta.kit?.id
      ? `/api/files/kits/${proposta.kit.id}/${proposta.kit.imagem_ia}`
      : '')
  )
}

/**
 * Resolve as fotos exibidas na tela (até 5): na ordem, as fotos escolhidas pelo
 * vendedor (obra do lead, galeria institucional, imagem IA do kit) e, se nenhuma
 * foi escolhida, a imagem IA do kit e as fotos da obra. Pode voltar vazio — nesse
 * caso os componentes mostram o placeholder de gradiente Ecosolar.
 */
export function resolverFotosTela(proposta: PublicProposta): FotoProposta[] {
  const out: FotoProposta[] = []
  const push = (url: string, legenda: string) => {
    if (url && out.length < 5) out.push({ url, legenda })
  }

  const selecionadas = Array.isArray(proposta.fotos_selecionadas) ? proposta.fotos_selecionadas : []

  for (const sel of selecionadas) {
    if (sel.origem === 'lead') {
      const ph = (proposta.fotos_obra || []).find((p) => p.id === sel.id)
      push(ph?.url || ph?.foto || '', sel.legenda || ph?.legenda || 'Instalação real do cliente')
    } else {
      const inst = INSTITUTIONAL_INSTALLATION_PHOTOS.find((p) => p.id === sel.id)
      if (inst) {
        push(inst.src, sel.legenda || inst.legenda)
      } else if (sel.id && sel.id.startsWith('kit_')) {
        push(urlImagemKitIa(proposta), sel.legenda || 'Simulação fotorrealista do kit homologado')
      } else if (sel.id) {
        const backendUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')
        push(
          `${backendUrl}/api/files/fotos_institucionais/${sel.id}/${sel.id}.jpg`,
          sel.legenda || 'Instalação solar homologada',
        )
      }
    }
  }

  if (out.length === 0) {
    push(urlImagemKitIa(proposta), `Simulação fotorrealista do ${proposta.kit_nome || 'kit solar'}`)
    for (const ph of proposta.fotos_obra || []) {
      if (out.length >= 5) break
      push(ph.url || ph.foto || '', ph.legenda || 'Obra Ecosolar Energy')
    }
  }

  return out
}
