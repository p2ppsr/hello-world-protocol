exports.transformer = async (req, res) => {
  const { MongoClient } = require('mongodb')
  const state = require('./state')
  // DO NOY USE `process` OR YOU WILL NOT BE ABLE TO ACCESS `process.env`
  const _process = require('./process')
  const rollback = require('./rollback')

  // Connect to the MongoDB
  const mongoClient = new MongoClient(
    process.env.MONGODB_WRITE_CREDS,
    { useUnifiedTopology: true }
  )
  await mongoClient.connect()
  const db = mongoClient.db(process.env.MONGODB_DATABASE)
  const session = await mongoClient.startSession()

  if (req.body.action === 'process') {
    await _process(state(db, session), req.body.payload)
  } else if (req.body.action === 'rollback') {
    await rollback(state(db, session), req.body.payload)
  }

  res.status(200).json({ status: 'success' })
}
