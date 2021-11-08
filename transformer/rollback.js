module.exports = async (state, action) => {
  try {
    console.log(`[-] ${action.tx.h}`)
    await state.delete({
      collection: 'hello',
      find: { _id: action.tx.h }
    })
    if (action.live) {
      await state.delete({
        collection: 'bridgeport_events',
        find: { _id: action.tx.h }
      })
    }
  } catch (e) {
    console.error(`[!] ${action.tx.h}`)
    console.error(e)
  }
}
