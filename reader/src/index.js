require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const query = require('./query')
const socket = require('./socket')
const defaults = require('./defaults')
const { MongoClient, ServerApiVersion } = require('mongodb')
const {
  PORT,
  MONGODB_READ_CREDS,
  MONGODB_DATABASE,
  BRIDGE
} = process.env

const bridge = JSON.parse(Buffer.from(BRIDGE, 'base64').toString('utf8'))
const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'))
app.use(`/${bridge.id}`, express.static(path.join(__dirname, '../public')))
app.use(express.json())
app.use(cors())

;(async () => {
  // Connect to the MongoDB
  const mongoClient = new MongoClient(
    Buffer.from(MONGODB_READ_CREDS, 'base64').toString('utf8'),
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1
    }
  )
  await mongoClient.connect()
  const db = mongoClient.db(MONGODB_DATABASE)

  // Bridge homepage is README.md of the reader, rendered as HTML
  app.get(`/${bridge.id}`, (req, res) => {
    res.render('readme', {
      markdown: require('fs')
        .readFileSync(path.join(__dirname, '../README.md')),
      bridge
    })
  })

  // Query frontend
  app.get(`/${bridge.id}/query`, (req, res) => {
    res.render('query', { bridge, defaultQuery: defaults.query })
  })
  app.get(`/${bridge.id}/query/:qs`, (req, res) => {
    res.render('query', { bridge, defaultQuery: defaults.query })
  })

  // Query backend
  app.get(`/${bridge.id}/q/:query`, (req, res) => {
    query({ db, req, res })
  })

  // Socket frontend
  app.get(`/${bridge.id}/socket`, (req, res) => {
    res.render('socket', { bridge, defaultSocket: defaults.socket })
  })
  app.get(`/${bridge.id}/socket/:qs`, (req, res) => {
    res.render('socket', { bridge, defaultSocket: defaults.socket })
  })

  // Socket backend
  app.get(`/${bridge.id}/s/:query`, (req, res) => {
    socket({ db, req, res })
  })

  // Listen
  app.listen(PORT, () => {
    console.log(`Bridge reader for ${bridge.id} listening on port ${PORT}`)
  })
})()
