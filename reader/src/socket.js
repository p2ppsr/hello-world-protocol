const validateQuery = require('./validateQuery')

module.exports = async ({ db, req, res }) => {
  try {
    let parsedQuery
    try {
      parsedQuery = JSON.parse(
        Buffer.from(req.params.query, 'base64').toString()
      )
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid query. The query must be a valid JSON object encoded as a base64 string.'
      })
    }

    // Validate the query
    if (validateQuery(res, parsedQuery, 'socket') !== 'success') {
      return
    }

    // Apply additional, socket-specific validation

    /*
      Before running the query, we need to extract the full document from the event that was sent back from the database server. We can't change the _id field in the root document (Mongo would throw errors), so we rename the original _id field to _bridgeport_original_id. As you'll see later on in the code, we will end up switching renaming it back to _id before emitting the SSE event.
    */
    const pipeline = [
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$fullDocument',
              { _id: '$_id', _bridgeport_original_id: '$fullDocument._id' }
            ]
          }
        }
      }
    ]

    /*
      Since we've changed the _id field into _bridgeport_original_id, we will now modify the find and project operations such that they are referencing the correct value.
    */
    if (typeof parsedQuery.q.find._id !== 'undefined') {
      parsedQuery.q.find._bridgeport_original_id = parsedQuery.q.find._id
      delete parsedQuery.q.find._id
    }
    pipeline.push({ $match: parsedQuery.q.find })
    if (parsedQuery.q.project) {
      if (typeof parsedQuery.q.project._id !== 'undefined') {
        parsedQuery.q.project._bridgeport_original_id = parsedQuery.q.project._id
        delete parsedQuery.q.project._id
      }
      pipeline.push({ $project: parsedQuery.q.project })
    }
    const cursor = await db
      .collection('bridgeport_events')
      .watch(pipeline)

    // Set up SSE stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Powered-By': 'Bridgeport',
      Connection: 'keep-alive'
    })
    res.write(
      '\ndata: ' + JSON.stringify({ type: 'open', data: [] }) + '\n\n'
    )

    // Every minute, send a heartbeat
    const heartbeatIntervalID = setInterval(() => {
      res.write(
        ':heartbeat' + '\n\n'
      )
    }, 30 * 1000)

    req.on('close', () => {
      cursor.close()
      clearInterval(heartbeatIntervalID)
    })

    cursor.on('change', event => {
      /*
        We will now rename the _bridgeport_original_id field back to _id before
        emitting the SSE event.

        In the future, we could leverage the original _id field (the one that
        we are overwriting here) to implement Last-Event-Id support in SSE.
      */
      event._id = event._bridgeport_original_id
      delete event._bridgeport_original_id
      res.write(
        'data: ' +
        JSON.stringify({
          type: 'message',
          data: event
        }) +
        '\n\n'
      )
    }, { fullDocument: 'updateLookup' })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}
