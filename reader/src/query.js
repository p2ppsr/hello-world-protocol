const validateQuery = require('./validateQuery')

module.exports = ({ db, req, res }) => {
  try {
    // Query must be a valid JSON object encoded as base64
    let parsedQuery
    try {
      parsedQuery = JSON.parse(Buffer.from(
        req.params.query,
        'base64'
      ).toString())
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid query. The query must be a valid JSON object encoded as a base64 string.'
      })
    }

    // Validate the query
    if (validateQuery(res, parsedQuery) !== 'success') {
      return
    }

    // Execute the query
    let cursor = db.collection(parsedQuery.q.collection)
    if (parsedQuery.q.aggregate) {
      cursor = cursor.aggregate(parsedQuery.q.aggregate)
    } else {
      cursor = cursor.find(parsedQuery.q.find)
      if (parsedQuery.q.sort) cursor = cursor.sort(parsedQuery.q.sort)
      if (parsedQuery.q.project) cursor = cursor.project(parsedQuery.q.project)
      if (parsedQuery.q.skip) cursor = cursor.skip(parsedQuery.q.skip)
      if (parsedQuery.q.limit) cursor = cursor.limit(parsedQuery.q.limit)
    }

    // Run the transformers, serving either a JSON or stream response
    if (req.headers.format === 'json') {
      return new Promise(resolve => {
        cursor.toArray().then(results => {
          res.status(200).json(results)
          resolve()
        })
      })
    } else {
      cursor.stream({
        transform: result => JSON.stringify(result) + '\n'
      }).pipe(res)
    }
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}
