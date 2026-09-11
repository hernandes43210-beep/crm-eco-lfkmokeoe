migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      user.set('name', 'Hernandes CEO')
      app.save(user)
    } catch (e) {
      console.log('User hernandes43210@gmail.com not found to update name:', e)
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'hernandes43210@gmail.com')
      user.set('name', 'Hernandes Admin')
      app.save(user)
    } catch (e) {
      console.log('User not found on rollback:', e)
    }
  },
)
