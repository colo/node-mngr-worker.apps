'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Pipeline'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Pipeline:Internals')

const path = require('path');


require('http').globalAgent.maxSockets = Infinity
require('https').globalAgent.maxSockets = Infinity

const HttpServerInput = require('./input/')

module.exports = function(http, out){

  debug('HTTP %o', http)

  let conf = {
    input: [
    {
    	push: {
    		id: "input.localhost.http",
    		conn: [
          Object.merge(
            Object.clone(http),
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
    filters: [
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        debug('FILTER %o', doc)
      }
    ],
    output: [
      // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),

    ]
  }

  return conf
}
