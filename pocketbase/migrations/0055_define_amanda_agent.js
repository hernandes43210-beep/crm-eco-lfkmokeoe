/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campos amanda_conversation_id e qualificada_ia na collection leads se não existirem
    const leadsCol = app.findCollectionByNameOrId('leads')
    if (!leadsCol.fields.getByName('amanda_conversation_id')) {
      leadsCol.fields.add(
        new TextField({
          name: 'amanda_conversation_id',
        }),
      )
    }
    if (!leadsCol.fields.getByName('qualificada_ia')) {
      leadsCol.fields.add(
        new BoolField({
          name: 'qualificada_ia',
        }),
      )
    }
    app.save(leadsCol)

    // 2. Garantir existência de um usuário de serviço para chats da IA (caso nenhum user esteja autenticado no webhook)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let serviceUser = null
    try {
      serviceUser = app.findAuthRecordByEmail('_pb_users_auth_', 'amanda.sdr@ecosolar.crm')
    } catch (_) {
      try {
        const rec = new Record(usersCol)
        rec.setEmail('amanda.sdr@ecosolar.crm')
        rec.setPassword($security.randomString(24))
        rec.setVerified(true)
        rec.set('name', 'Amanda SDR (IA)')
        rec.set('role', 'Vendedor')
        app.save(rec)
        serviceUser = rec
      } catch (err) {
        console.warn('[0055_define_amanda_agent] Aviso ao criar usuário de serviço Amanda:', err)
      }
    }

    // 3. Definir o agente nativo 'amanda' no Skip Cloud via $ai.agents.define
    const systemPrompt = `Você é a Amanda, SDR (pré-vendas e primeiro contato) da Ecosolar, empresa de energia solar fotovoltaica.
Seu estilo: extremamente educada, direta, tom humano, caloroso e informal-profissional brasileiro (como alguém digitando no WhatsApp).

DIRETRIZES FUNDAMENTAIS:
1. RESPOSTAS SEMPRE CURTAS: no máximo 2 a 3 frases. Nada de blocos de texto longos.
2. UMA PERGUNTA POR VEZ: NUNCA faça duas perguntas na mesma mensagem.
3. OBJETIVO DE QUALIFICAÇÃO: Coletar EXATAMENTE 3 informações do lead:
   - (1) Consumo atual de energia (valor médio da conta de luz em R$ ou consumo em kWh/mês).
   - (2) Se pretende aumentar o consumo no futuro (ex.: instalar ar-condicionado, comprar carro elétrico, expansão).
   - (3) Local da instalação: cidade e bairro, mais o tipo de imóvel (casa, comércio, galpão ou rural).
4. QUALIFICAÇÃO COMPLETA: Quando o lead fornecer as 3 informações acima, finalize de forma breve e acolhedora, agradecendo e informando que você organizou todos os dados e está direcionando o atendimento para o consultor solar especialista responsável pela região dele, que entrará em contato em breve para apresentar a proposta sob medida.
5. REGRA ABSOLUTA SOBRE PREÇOS: NUNCA, em hipótese alguma, forneça valor, preço, estimativa ou prometa descontos. Se o cliente perguntar "quanto custa?", "qual o preço?", "dá desconto?", responda com naturalidade e brevidade: diga que o sistema é 100% personalizado de acordo com o consumo e telhado, e que o consultor apresentará a proposta detalhada com os valores exatos.
6. Não invente equipamentos, fabricantes ou garantias mirabolantes.
7. Mantenha o diálogo sempre em português brasileiro impecável e amigável.`

    $ai.agents.define(app, {
      slug: 'amanda',
      name: 'Amanda (SDR Ecosolar)',
      description:
        'SDR de pré-vendas que qualifica leads novos por WhatsApp e e-mail com respostas curtas e humanas.',
      systemPrompt: systemPrompt,
      tier: 'fast',
      tools: [
        {
          collection: 'leads',
          perms: { read: true, list: true, update: true },
          actAs: 'admin',
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'A Ecosolar é integradora de energia solar fotovoltaica para residências, comércios, indústrias e propriedades rurais. Amanda é a SDR responsável pelo primeiro atendimento.',
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Quanto custa um sistema de energia solar?',
                answer:
                  'Cada projeto da Ecosolar é personalizado com base no seu consumo e no espaço disponível. Por isso, nosso consultor responsável pela sua região apresentará uma proposta completa com os valores sob medida.',
              },
              {
                question: 'Vocês dão desconto?',
                answer:
                  'Nosso consultor comercial avalia as melhores condições de pagamento e viabilidade para cada caso na apresentação da proposta.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'amanda')
    } catch (_) {}
  },
)
