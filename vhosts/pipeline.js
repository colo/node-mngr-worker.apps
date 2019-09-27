'use strict'

var debug = require('debug')('Server:Apps:Vhosts:Pipeline');
var debug_internals = require('debug')('Server:Apps:Vhosts:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

// let procs_filter = require('./filters/proc'),
//     networkInterfaces_filter = require('./filters/networkInterfaces'),
let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'))
    // compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

let NginxPollHttp = require('node-app-http-client/load')(PollHttp)
// let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)

// let modules = {}
// let all_modules = {
//   'os': false,
//   // 'os.procs': false,
//   // 'os.procs.stats': false,
//   // // 'os.procs.uid': false,
//   // 'os.procs.uid.stats': false,
//   // // 'os.procs.cmd': false,
//   // 'os.procs.cmd.stats': false,
//   'os.mounts': false,
//   'os.blockdevices': false,
//   'os.networkInterfaces': false,
//   'os.networkInterfaces.stats': false
// }
//
// let meta_doc = { id: '', data: [], metadata: { path: 'os.merged', type: 'periodical', merged: true }}
// let meta_docs = {}

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

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
              module: NginxPollHttp,
              load: ['apps/vhosts/input/nginx']
            },
          )

  			],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
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
   filters: [
  		function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts


        // let host = doc.metadata.host
        // let module = doc.metadata.path

        let host = input_type.options.id
        doc.metadata.host = input_type.options.id
        let timestamp = roundMilliseconds(Date.now())
        doc.id = doc.metadata.host+'.'+doc.metadata.path+'.'+doc.data.schema+'.'+doc.data.uri+'.'+doc.data.port
        // +'@'+timestamp
        doc.metadata.timestamp = timestamp
        doc.metadata.id = doc.id
        doc.metadata.type = 'periodical'

        debug('filter %o', doc)
        sanitize_filter(
          doc,
          opts,
          pipeline.output.bind(pipeline),
          pipeline
        )

      }

      

  	],
  	output: [
      // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
  		//require('./snippets/output.stdout.template'),

      {
  			rethinkdb: {
  				id: "output.vhosts.rethinkdb",
  				conn: [
            Object.merge(
              Object.clone(out),
              {table: 'vhosts'}
            )
  				],
  				module: require('js-pipeline/output/rethinkdb'),
          buffer:{
  					// size: 1, //-1
  					// expire:0
            size: -1,
            expire: 999,
  				}
  			}
  		}
  	]
  }

  return conf
}
