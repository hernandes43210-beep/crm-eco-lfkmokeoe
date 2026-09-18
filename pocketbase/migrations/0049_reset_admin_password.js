migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      user.setPassword('Ecosolar@2026')
      app.save(user)
      console.log(
        'Senha do usuario hernandes43210@gmail.com redefinida com sucesso para Ecosolar@2026',
      )
    } catch (e) {
      console.log('Erro ao redefinir senha do usuario hernandes43210@gmail.com:', e)
      throw e
    }
  },
  (app) => {
    // Reversao opcional/noop pois a senha anterior era desconhecida/perdida
  },
)
