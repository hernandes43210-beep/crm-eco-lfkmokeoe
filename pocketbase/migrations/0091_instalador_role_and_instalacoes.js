// Migration 0091 — Função "Instalador" e coleção de instalações enviadas ao instalador
// - Adiciona o valor 'Instalador' ao select de role das coleções users e convidados.
// - Cria a coleção 'instalacoes_instalador' com RLS:
//   - Admin/CEO vê e edita tudo; instalador vê/edita SOMENTE registros onde instalador = ele mesmo;
//   - Vendedores não veem nada (só podem criar via hook superuser — createRule fecha para o público autenticado).
migrate(
  (app) => {
    // 1. Adicionar 'Instalador' ao select de role da coleção users (idempotente)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const userRoleField = usersCol.fields.getByName('role')
    if (userRoleField) {
      let jaTemInstalador = false
      try {
        jaTemInstalador = userRoleField.values.indexOf('Instalador') !== -1
      } catch (_) {}
      if (!jaTemInstalador) {
        const valoresAtuais = []
        try {
          for (let i = 0; i < userRoleField.values.length; i++) {
            valoresAtuais.push(userRoleField.values[i])
          }
        } catch (_) {}
        valoresAtuais.push('Instalador')
        usersCol.fields.removeByName('role')
        usersCol.fields.add(
          new SelectField({
            name: 'role',
            required: false,
            values: valoresAtuais,
            maxSelect: 1,
          }),
        )
        app.save(usersCol)
      }
    }

    // 2. Adicionar 'Instalador' ao select de role da coleção convidados (idempotente)
    try {
      const convidadosCol = app.findCollectionByNameOrId('convidados')
      const convRoleField = convidadosCol.fields.getByName('role')
      if (convRoleField) {
        let jaTemInstaladorConv = false
        try {
          jaTemInstaladorConv = convRoleField.values.indexOf('Instalador') !== -1
        } catch (_) {}
        if (!jaTemInstaladorConv) {
          const valoresConv = []
          try {
            for (let j = 0; j < convRoleField.values.length; j++) {
              valoresConv.push(convRoleField.values[j])
            }
          } catch (_) {}
          valoresConv.push('Instalador')
          convidadosCol.fields.removeByName('role')
          convidadosCol.fields.add(
            new SelectField({
              name: 'role',
              required: true,
              values: valoresConv,
              maxSelect: 1,
            }),
          )
          app.save(convidadosCol)
        }
      }
    } catch (convErr) {
      console.warn('[0091] convidados: ' + convErr)
    }

    // 3. Adicionar 'instalacao' ao select de tipo da coleção notificacoes (idempotente)
    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes')
      const notifTipoField = notifCol.fields.getByName('tipo')
      if (notifTipoField) {
        let jaTemTipo = false
        try {
          jaTemTipo = notifTipoField.values.indexOf('instalacao') !== -1
        } catch (_) {}
        if (!jaTemTipo) {
          const valoresTipo = []
          try {
            for (let k = 0; k < notifTipoField.values.length; k++) {
              valoresTipo.push(notifTipoField.values[k])
            }
          } catch (_) {}
          valoresTipo.push('instalacao')
          notifCol.fields.removeByName('tipo')
          notifCol.fields.add(
            new SelectField({
              name: 'tipo',
              required: false,
              values: valoresTipo,
              maxSelect: 1,
            }),
          )
          app.save(notifCol)
        }
      }
    } catch (notifErr) {
      console.warn('[0091] notificacoes: ' + notifErr)
    }

    // 4. Criar coleção 'instalacoes_instalador'
    if (!app.hasTable('instalacoes_instalador')) {
      const usersColId = '_pb_users_auth_'
      const leadsColId = app.findCollectionByNameOrId('leads').id

      const instalacoesCol = new Collection({
        name: 'instalacoes_instalador',
        type: 'base',
        // RLS:
        // - Admin/CEO: acesso total.
        // - Instalador: somente registros onde instalador = ele mesmo (não pode criar/deletar).
        // - Vendedores: nada — o envio é feito pelo hook (superuser).
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO' || instalador = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO' || instalador = @request.auth.id)",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO' || (instalador = @request.auth.id && instalador = @request.body.instalador))",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Admin' || @request.auth.role = 'CEO')",
        fields: [
          {
            name: 'lead',
            type: 'relation',
            required: true,
            collectionId: leadsColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'instalador',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'cliente_nome',
            type: 'text',
            required: true,
            max: 200,
          },
          {
            name: 'endereco_completo',
            type: 'text',
            required: true,
            maxSize: 1000,
          },
          {
            name: 'localizacao',
            type: 'text',
            required: false,
            maxSize: 1000,
          },
          {
            name: 'datasheets',
            type: 'json',
            required: false,
            maxSize: 4000000,
          },
          {
            name: 'data_envio',
            type: 'date',
            required: false,
          },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['pendente', 'em_andamento', 'concluida'],
            maxSelect: 1,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
            maxSize: 4000,
          },
          {
            name: 'enviado_por',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_instalacoes_instalador ON instalacoes_instalador (instalador)',
          'CREATE INDEX idx_instalacoes_lead ON instalacoes_instalador (lead)',
          'CREATE INDEX idx_instalacoes_status ON instalacoes_instalador (status)',
          'CREATE INDEX idx_instalacoes_created ON instalacoes_instalador (created DESC)',
        ],
      })

      app.save(instalacoesCol)
    }
  },
  (app) => {
    try {
      const instalacoesCol = app.findCollectionByNameOrId('instalacoes_instalador')
      app.delete(instalacoesCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const userRoleField = usersCol.fields.getByName('role')
      if (userRoleField) {
        const semInstalador = []
        try {
          for (let i = 0; i < userRoleField.values.length; i++) {
            if (userRoleField.values[i] !== 'Instalador') {
              semInstalador.push(userRoleField.values[i])
            }
          }
        } catch (_) {}
        usersCol.fields.removeByName('role')
        usersCol.fields.add(
          new SelectField({
            name: 'role',
            required: false,
            values: semInstalador.length > 0 ? semInstalador : ['Admin', 'Vendedor'],
            maxSelect: 1,
          }),
        )
        app.save(usersCol)
      }
    } catch (_) {}

    try {
      const convidadosCol = app.findCollectionByNameOrId('convidados')
      const convRoleField = convidadosCol.fields.getByName('role')
      if (convRoleField) {
        const semInstaladorConv = []
        try {
          for (let j = 0; j < convRoleField.values.length; j++) {
            if (convRoleField.values[j] !== 'Instalador') {
              semInstaladorConv.push(convRoleField.values[j])
            }
          }
        } catch (_) {}
        convidadosCol.fields.removeByName('role')
        convidadosCol.fields.add(
          new SelectField({
            name: 'role',
            required: true,
            values: semInstaladorConv.length > 0 ? semInstaladorConv : ['Admin', 'Vendedor'],
            maxSelect: 1,
          }),
        )
        app.save(convidadosCol)
      }
    } catch (_) {}
  },
)
