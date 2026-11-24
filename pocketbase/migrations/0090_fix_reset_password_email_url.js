// 0090: corrige o e-mail de "Redefinir senha" do fluxo "Esqueci minha senha" (v0.0.199).
// O template nativo apontava para {APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}
// (dashboard do PocketBase), que resulta em 404 no CRM SPA. Agora o link abre a
// tela pública /redefinir-senha?token={TOKEN} do app, onde o usuário confirma a
// nova senha via confirmPasswordReset.
// ADD-ONLY e idempotente: só atualiza o template quando o corpo ainda difere do
// esperado (re-run não gera alteração). Usa apenas construtores válidos do JSVM.
const URL_NOVA =
  'https://crm-de-vendas-solar-dce30--preview.goskip.app/redefinir-senha?token={TOKEN}'

const MARCA_ANTIGA = '_/#/auth/confirm-password-reset/'

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    const tpl = col.resetPasswordTemplate
    if (!tpl) return

    const bodyAtual = tpl.body || ''
    if (bodyAtual.indexOf('/redefinir-senha?token={TOKEN}') !== -1) return // já aplicado

    // Reaproveita o corpo atual (preserva o HTML personalizado) apenas trocando a URL.
    let novoBody = bodyAtual
    if (bodyAtual.indexOf(MARCA_ANTIGA) !== -1 || bodyAtual.indexOf('{APP_URL}') !== -1) {
      novoBody = bodyAtual
        .split(MARCA_ANTIGA + '{TOKEN}')
        .join(URL_NOVA)
        .split('{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}')
        .join(URL_NOVA)
    } else {
      // Corpo desconhecido: escreve um corpo padrão com o link correto.
      novoBody =
        '<p>Olá,</p>' +
        '<p>Clique no botão abaixo para redefinir sua senha:</p>' +
        '<p><a class="btn" href="' +
        URL_NOVA +
        '" target="_blank" rel="noopener">Redefinir senha</a></p>' +
        '<p><i>Se você não solicitou a redefinição, ignore este e-mail.</i></p>' +
        '<p>Obrigado,<br/>{APP_NAME} team</p>'
    }

    tpl.body = novoBody
    col.resetPasswordTemplate = tpl
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    const tpl = col.resetPasswordTemplate
    if (!tpl) return
    const bodyAtual = tpl.body || ''
    if (bodyAtual.indexOf('/redefinir-senha?token={TOKEN}') === -1) return
    tpl.body = bodyAtual
      .split('https://crm-de-vendas-solar-dce30--preview.goskip.app/redefinir-senha?token={TOKEN}')
      .join('{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}')
    col.resetPasswordTemplate = tpl
    app.save(col)
  },
)
