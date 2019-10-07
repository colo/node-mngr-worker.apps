'use strict'

var debug = require('debug')('Server:Apps:UI:Pipeline');
var debug_internals = require('debug')('Server:Apps:UI:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

// let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

let UIHttp = require('node-app-http-client/load')(PollHttp)

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

/**
* keep 'all' request on cache for faster UI start up
**/
module.exports = function(http, out){
  let conf = {
   input: [
  	{
  		poll: {
  			id: "input.nginx.http",
  			conn: [
          Object.merge(
            Object.clone(http),
            {
              module: UIHttp,
              load: ['apps/ui/input/']
            },
          )

  			],
        connect_retry_count: -1,
        connect_retry_periodical: 60000,
  			requests: {
  				// periodical: 1000,
          periodical: function(dispatch){
            // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
            return cron.schedule('* * * * *', dispatch);//every minute
          },
  			},
  		},
  	},


   ],
   // filters: [
  	// 	function(doc, opts, next, pipeline){
   //      let { type, input, input_type, app } = opts
   //      debug('filter %o', doc)
   //
   //      // // let host = doc.metadata.host
   //      // // let module = doc.metadata.path
   //      //
   //      // let host = input_type.options.id
   //      // doc.metadata.host = input_type.options.id
   //      // let timestamp = roundMilliseconds(Date.now())
   //      // doc.id = doc.metadata.host+'.'+doc.metadata.path+'.'+doc.data.schema+'.'+doc.data.uri+'.'+doc.data.port
   //      // // +'@'+timestamp
   //      // doc.metadata.timestamp = timestamp
   //      // doc.metadata.id = doc.id
   //      // doc.metadata.type = 'periodical'
   //      //
   //      // debug('filter %o', doc)
   //      // sanitize_filter(
   //      //   doc,
   //      //   opts,
   //      //   pipeline.output.bind(pipeline),
   //      //   pipeline
   //      // )
   //
   //    }
   //
   //
   //
  	// ],
  	// output: [
    //   // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
  	// 	//require('./snippets/output.stdout.template'),
    //
    //   {
  	// 		rethinkdb: {
  	// 			id: "output.vhosts.rethinkdb",
  	// 			conn: [
    //         Object.merge(
    //           Object.clone(out),
    //           {table: 'vhosts'}
    //         )
  	// 			],
  	// 			module: require('js-pipeline/output/rethinkdb'),
    //       buffer:{
  	// 				// size: 1, //-1
  	// 				// expire:0
    //         // size: -1,
    //         expire: 1001,
  	// 			}
  	// 		}
  	// 	}
  	// ]
  }

  return conf
}
