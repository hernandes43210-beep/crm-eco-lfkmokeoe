// Custom route for verifying invite code and creating new user with assigned role
routerAdd('POST', '/backend/v1/cadastro', (e) => {
  const body = e.requestInfo().body || {}
  const nome = (body.nome || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const codigoConvite = (body.codigo_convite || '').trim().toUpperCase()

  if (!email || !password || !codigoConvite) {
    return e.json(400, { message: 'E-mail, senha e código de convite são obrigatórios.' })
  }

  if (password.length < 8) {
    return e.json(400, { message: 'A senha deve conter no mínimo 8 caracteres.' })
  }

  // 1. Check invite code in 'convidados' collection
  let inviteRecord = null
  try {
    inviteRecord = $app.findFirstRecordByData('convidados', 'codigo_convite', codigoConvite)
  } catch (_) {
    return e.json(400, { message: 'Código de convite inválido ou não encontrado.' })
  }

  if (!inviteRecord.getBool('ativo')) {
    return e.json(400, { message: 'Este código de convite já foi utilizado ou está inativo.' })
  }

  // Verify email matches invite if specified
  const inviteEmail = inviteRecord.getString('email').trim().toLowerCase()
  if (inviteEmail && inviteEmail !== email) {
    return e.json(400, {
      message: 'O e-mail informado não corresponde ao e-mail deste convite (' + inviteEmail + ').',
    })
  }

  // 2. Check if user with this email already exists
  try {
    $app.findAuthRecordByEmail('_pb_users_auth_', email)
    return e.json(400, { message: 'Já existe uma conta cadastrada com este e-mail.' })
  } catch (_) {
    // User does not exist, good to proceed
  }

  // 3. Create new user
  const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
  const newUser = new Record(usersCol)
  newUser.setEmail(email)
  newUser.setPassword(password)
  newUser.setVerified(true)
  newUser.set('name', nome || inviteRecord.getString('nome') || 'Membro da Equipe')
  newUser.set('role', inviteRecord.getString('role') || 'Vendedor')

  try {
    $app.save(newUser)
  } catch (err) {
    return e.json(500, { message: 'Erro ao criar conta de usuário: ' + err.message })
  }

  // 4. Deactivate invite code
  inviteRecord.set('ativo', false)
  try {
    $app.save(inviteRecord)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Cadastro realizado com sucesso!',
    user: {
      id: newUser.id,
      email: newUser.getString('email'),
      name: newUser.getString('name'),
      role: newUser.getString('role'),
    },
  })
})
