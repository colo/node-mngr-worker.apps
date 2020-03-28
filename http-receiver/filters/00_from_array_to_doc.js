'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Filter:from_array_to_doc'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Filter:from_array_to_doc:Internals')


module.exports = function(doc, opts, next, pipeline){
  debug('DOC', doc)
  // process.exit(1)
  if(Array.isArray(doc)){
    Array.each(doc, function(_doc){
      next(_doc, opts, next, pipeline)
    })
  }
  else{
    next(doc, opts, next, pipeline)
  }

}
