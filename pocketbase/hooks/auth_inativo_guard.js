// Hook para bloquear autenticação de usuários inativos e impedir login/refresh
// Coleção: users (_pb_users_auth_)
//
// Regras:
// 1. Intercepta requisições de autenticação de 'users' (onRecordAuthRequest).
// 2. Se o registro autenticado possuir ativo === false, interrompe o fluxo e retorna
//    erro HTTP 403 com a mensagem: "Conta desativada. Fale com o administrador."
// 3. Aplica tanto para login inicial (senha/oauth) quanto para refresh de token de sessão,
//    invalidando a sessão de quem for desativado enquanto logado.
//
// ⚠ Scoping: todo o código e variáveis ficam estritamente contidos dentro do callback.

onRecordAuthRequest((e) => {
  const record = e.record
  if (!record) {
    return e.next()
  }

  try {
    const colName = record.collection() ? record.collection().name : ''
    if (colName === 'users' || colName === '_pb_users_auth_') {
      const isAtivo = record.get('ativo')
      // Se explicitamente false (0 ou false), bloqueia
      if (isAtivo === false || isAtivo === 0 || isAtivo === 'false') {
        return e.forbiddenError('Conta desativada. Fale com o administrador.', null)
      }
    }
  } catch (err) {
    console.error('[auth_inativo_guard] Erro ao validar status ativo do usuario:', err)
  }

  return e.next()
}, 'users')
