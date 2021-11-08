module.exports = (res, parsedQuery, mode) => {
  // Query must contain "v" = 3
  if (parsedQuery.v !== 3) {
    return res.status(400).json({
      error: 'Invalid query. The query must have a "v" field with value 3.'
    })
  }

  // Query must contain "q"
  if (typeof parsedQuery.q !== 'object') {
    return res.status(400).json({
      error: 'Invalid query. The query must have a "q" field that is an object.'
    })
  }

  // Query can only contain a v-block and a q-block
  if (
    Object.keys(parsedQuery).some(block => block !== 'q' && block !== 'v')
  ) {
    return res.status(400).json({
      error: 'Invalid query. The query cannot contain anything other than a q-block and a v-block.'
    })
  }

  if (mode === 'socket' && Object.keys(parsedQuery.q).some(f => (
    f === 'aggregate' ||
    f === 'collection' ||
    f === 'sort' ||
    f === 'skip' ||
    f === 'limit'
  ))) {
    return res.status(400).json({
      error: 'When connecting to a socket, "aggregate", "collection", "sort", "skip" and "limit" are not allowed.'
    })
  }

  if (mode !== 'socket') {
    // Query Q-block must contain a collection name
    if (typeof parsedQuery.q.collection !== 'string') {
      return res.status(400).json({
        error: 'Invalid query. Provide a collection name in the q-block.'
      })
    }

    // Collection must not start with bridgeport_
    if (parsedQuery.q.collection.startsWith('bridgeport_')) {
      return res.status(400).json({
        error: 'You are not allowed to perform operations on collections that start with "bridgeport_"'
      })
    }
  }

  // Query q-block must contain either find or aggregate
  if (!parsedQuery.q.find && !parsedQuery.q.aggregate) {
    if (mode !== 'socket') {
      return res.status(400).json({
        error: 'Invalid query. The q-block must contain either find or aggregate.'
      })
    } else {
      return res.status(400).json({
        error: 'Invalid query. The q-block must contain a find field.'
      })
    }
  }

  if (parsedQuery.q.aggregate) {
    // When aggregating, "aggregate" must be an array of objects
    if (
      !Array.isArray(parsedQuery.q.aggregate) ||
        parsedQuery.q.aggregate.some(stage => typeof stage !== 'object')
    ) {
      return res.status(400).json({
        error: 'Invalid query. When aggregating, the "aggregate" field must be an array of objects.'
      })
    }

    // When aggregating, "collection" and "aggregate" must be the only q-block fields
    if (
      Object.keys(parsedQuery.q)
        .some(field => field !== 'aggregate' && field !== 'collection')
    ) {
      return res.status(400).json({
        error: 'Invalid query. When aggregating, "aggregate" and "collection" must be the only two fields in the q-block.'
      })
    }
  } else {
    // When not aggregating, find block must be an object
    if (typeof parsedQuery.q.find !== 'object') {
      return res.status(400).json({
        error: 'Invalid query. The "find" field must be an object.'
      })
    }

    // When not aggregating, only "collection", "find", "sort", "project", "skip", and "limit" can be given as q-block fields
    if (Object.keys(parsedQuery.q).some(givenField => {
      const acceptedFields = [
        'collection', 'find', 'sort', 'project', 'skip', 'limit'
      ]
      return !acceptedFields
        .some(acceptedField => givenField === acceptedField)
    })) {
      return res.status(400).json({
        error: 'Invalid query. When not aggregating, only "collection", "find", "sort", "project", "skip", and "limit" can be given as q-block fields.'
      })
    }

    // When sort is given, it must be an object
    if (
      typeof parsedQuery.q.sort !== 'undefined' &&
        typeof parsedQuery.q.sort !== 'object'
    ) {
      return res.status(400).json({
        error: 'Invalid query. The "sort" field must be an object.'
      })
    }

    // When project is given, it must be an object
    if (
      typeof parsedQuery.q.project !== 'undefined' &&
        typeof parsedQuery.q.project !== 'object'
    ) {
      return res.status(400).json({
        error: 'Invalid query. The "project" field must be an object.'
      })
    }

    // When skip is given, it must be a number
    if (
      typeof parsedQuery.q.skip !== 'undefined' &&
        typeof parsedQuery.q.skip !== 'number'
    ) {
      return res.status(400).json({
        error: 'Invalid query. The "skip" field must be a number.'
      })
    }

    // When limit is given, it must be a number
    if (
      typeof parsedQuery.q.limit !== 'undefined' &&
        typeof parsedQuery.q.limit !== 'number'
    ) {
      return res.status(400).json({
        error: 'Invalid query. The "limit" field must be a number.'
      })
    }
  }

  // If all validation passes, return 'success'
  return 'success'
}
