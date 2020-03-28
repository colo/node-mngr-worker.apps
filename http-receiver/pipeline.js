'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Pipeline'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Pipeline:Internals')

const path = require('path');


require('http').globalAgent.maxSockets = Infinity
require('https').globalAgent.maxSockets = Infinity

const HttpServerInput = require('./input/')

module.exports = function(payload){
  let {input, output, filters, opts} = payload

  // Array.each(filters, function(filter, i){
  //   filters[i] = filter(payload)
  // })

  /**
  * test
  **/
  // filters.push(function(doc, opts, next, pipeline){
  //   let { type, input, input_type, app } = opts
  //   debug('FILTER %o', doc)
  //   next(doc)
  // })

  debug('ouput %o', output)

  let conf = {
    input: [
    {
    	push: {
    		id: "input.localhost.http",
    		conn: [
          Object.merge(
            Object.clone(input),
            {
              // module: HttpServer,
              // load: ['apps/http-receiver/input']
              module: HttpServerInput,
            },
          )
    		],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
    		// requests: {
    		// 	// periodical: 1000,
        //   periodical: function(dispatch){
        //     // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
        //     return cron.schedule('* * * * * *', dispatch);//every 20 secs
        //   },
    		// },
    	},
    },

    ],
    filters: filters,
    output: output
  }

  conf = Object.merge(conf, opts)

  return conf
}
