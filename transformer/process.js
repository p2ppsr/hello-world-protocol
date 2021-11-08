module.exports = async (state, action) => {
  try {
    console.log(`[+] ${action.tx.h}`)

    // Transaction must contain correct protocol namespace
    if (action.out[0].s2 !== '1He11omzQsAeYa2JUj52sFZRQEsSzPFNZx') {
      throw new Error(
        'Transaction has invalid protocol namespace!'
      )
    }

    // Transactions where the key from s3 did not sign an input are invalid
    if (!(action.in.some(input => input.e.a === action.out[0].s3))) {
      throw new Error(
        'HWP sender did not sign at least one input to the transaction!'
      )
    }

    // Message must exist, and not be an "f" attribute longer than 512 bytes
    if (
      !action.out[0].s4 ||
        action.out[0].f4 ||
        action.out[0].s4.length > 512
    ) {
      throw new Error('Message is either missing or longer than 512 bytes!')
    }

    // HWP message is constructed from the fields of the Bitcoin transaction
    const data = {
      _id: action.tx.h,
      sender: action.out[0].s3,
      message: action.out[0].s4
    }

    // Insert HWP messages into the database
    await state.create({
      collection: 'hello',
      data
    })
    if (action.live) {
      await state.create({
        collection: 'bridgeport_events',
        data
      })
    }
  } catch (e) {
    console.error(`[!] ${action.tx.h}`)
    console.error(e)
  }
}
