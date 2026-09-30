migrate(
  (app) => {
    // 0072_add_comprovantes_pagamento_homologacoes.js
    //
    // Suporte ao anexo de comprovante de pagamento da ART e do Projeto
    // Exclusivo para Admin/CEO na Ficha de Trabalho da Área de Engenharia (/engenharia).
    //
    // 1. Atualizar campos em 'homologacoes':
    //    - comprovante_art_arquivo (file, PDF ou imagem JPG/PNG/WEBP, até 30MB)
    //    - comprovante_art_anexado_em (date)
    //    - comprovante_art_anexado_por (relation -> users)
    //    - projeto_pago (bool, indica se o projeto foi marcado como pago)
    //    - comprovante_projeto_arquivo (file, PDF ou imagem JPG/PNG/WEBP, até 30MB)
    //    - comprovante_projeto_anexado_em (date)
    //    - comprovante_projeto_anexado_por (relation -> users)
    //
    // 2. Atualizar 'arquivos_engenharia' categoria para incluir comprovantes caso registrado lá também:
    //    'comprovante_pagamento'
    //
    // 3. Atualizar SelectField 'tipo' na coleção 'notificacoes' para permitir 'comprovante_pagamento'

    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Atualizar 'homologacoes'
    if (app.hasTable('homologacoes')) {
      const homCol = app.findCollectionByNameOrId('homologacoes')

      if (!homCol.fields.getByName('comprovante_art_arquivo')) {
        homCol.fields.add(
          new FileField({
            name: 'comprovante_art_arquivo',
            required: false,
            maxSelect: 1,
            maxSize: 31457280, // 30MB
            mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          }),
        )
      }

      if (!homCol.fields.getByName('comprovante_art_anexado_em')) {
        homCol.fields.add(
          new DateField({
            name: 'comprovante_art_anexado_em',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('comprovante_art_anexado_por')) {
        homCol.fields.add(
          new RelationField({
            name: 'comprovante_art_anexado_por',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }

      if (!homCol.fields.getByName('projeto_pago')) {
        homCol.fields.add(
          new BoolField({
            name: 'projeto_pago',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('comprovante_projeto_arquivo')) {
        homCol.fields.add(
          new FileField({
            name: 'comprovante_projeto_arquivo',
            required: false,
            maxSelect: 1,
            maxSize: 31457280, // 30MB
            mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          }),
        )
      }

      if (!homCol.fields.getByName('comprovante_projeto_anexado_em')) {
        homCol.fields.add(
          new DateField({
            name: 'comprovante_projeto_anexado_em',
            required: false,
          }),
        )
      }

      if (!homCol.fields.getByName('comprovante_projeto_anexado_por')) {
        homCol.fields.add(
          new RelationField({
            name: 'comprovante_projeto_anexado_por',
            required: false,
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }

      app.save(homCol)
    }

    // 2. Atualizar select de categoria em arquivos_engenharia se aplicável
    if (app.hasTable('arquivos_engenharia')) {
      const arqCol = app.findCollectionByNameOrId('arquivos_engenharia')
      const catField = arqCol.fields.getByName('categoria')
      if (catField) {
        arqCol.fields.removeByName('categoria')
        arqCol.fields.add(
          new SelectField({
            name: 'categoria',
            required: true,
            values: [
              'projeto_eletrico',
              'plantas',
              'processo_energisa',
              'art_documento',
              'memorial_descritivo',
              'parecer_acesso',
              'relatorio_vistoria',
              'comprovante_pagamento',
              'outros',
            ],
            maxSelect: 1,
          }),
        )
        app.save(arqCol)
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('homologacoes')) {
        const homCol = app.findCollectionByNameOrId('homologacoes')
        if (homCol.fields.getByName('comprovante_art_arquivo')) {
          homCol.fields.removeByName('comprovante_art_arquivo')
        }
        if (homCol.fields.getByName('comprovante_art_anexado_em')) {
          homCol.fields.removeByName('comprovante_art_anexado_em')
        }
        if (homCol.fields.getByName('comprovante_art_anexado_por')) {
          homCol.fields.removeByName('comprovante_art_anexado_por')
        }
        if (homCol.fields.getByName('projeto_pago')) {
          homCol.fields.removeByName('projeto_pago')
        }
        if (homCol.fields.getByName('comprovante_projeto_arquivo')) {
          homCol.fields.removeByName('comprovante_projeto_arquivo')
        }
        if (homCol.fields.getByName('comprovante_projeto_anexado_em')) {
          homCol.fields.removeByName('comprovante_projeto_anexado_em')
        }
        if (homCol.fields.getByName('comprovante_projeto_anexado_por')) {
          homCol.fields.removeByName('comprovante_projeto_anexado_por')
        }
        app.save(homCol)
      }
    } catch (_) {}
  },
)
