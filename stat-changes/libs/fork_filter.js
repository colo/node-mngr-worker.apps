'use strict'

let Moo = require("mootools"),
    debug = require('debug')('Server:Apps:Stat:Periodical:libs:fork_filter')



debug('args', process.argv)
let filter = require(process.argv[2])

process.on('message', (msg) => {
  debug('message', msg)
  if(msg.params){
    let params = Array.clone(msg.params)
    params.push(function(data){
      debug('data', data)
      process.send({
        result: data,
        doc: msg.doc
      })
    })
    filter.attempt(params)
  }
});
