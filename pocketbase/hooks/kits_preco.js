// Automatically computes preco_venda on kits create/update: custo / (1 - margem/100)
onRecordCreate((e) => {
  const record = e.record
  const custo = record.getFloat('custo')
  const margem = record.getFloat('margem')

  if (custo > 0 && margem >= 0 && margem < 100) {
    const preco = custo / (1 - margem / 100)
    record.set('preco_venda', Math.round(preco * 100) / 100)
  }

  e.next()
}, 'kits')

onRecordUpdate((e) => {
  const record = e.record
  const custo = record.getFloat('custo')
  const margem = record.getFloat('margem')

  if (custo > 0 && margem >= 0 && margem < 100) {
    const preco = custo / (1 - margem / 100)
    record.set('preco_venda', Math.round(preco * 100) / 100)
  }

  e.next()
}, 'kits')
