'use strict'

var debug = require('debug')('Server:Apps:OS:Pipeline');
var debug_internals = require('debug')('Server:Apps:OS:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

let procs_filter = require('./filters/proc'),
    networkInterfaces_filter = require('./filters/networkInterfaces'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

let OSPollHttp = require('node-app-http-client/load')(PollHttp)
let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)

let modules = {}
let all_modules = {
  'os': false,
  'os.procs': false,
  // 'os.procs.stats': false,
  'os.procs.uid': false,
  // 'os.procs.uid.stats': false,
  'os.procs.cmd': false,
  // 'os.procs.cmd.stats': false,
  'os.mounts': false,
  'os.blockdevices': false,
  'os.networkInterfaces': false,
  // 'os.networkInterfaces.stats': false
}

let meta_doc = { id: '', data: [], metadata: { path: 'os.merged', type: 'periodical', merged: true }}
let meta_docs = {}

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
  			id: "input.os.http",
  			conn: [
          Object.merge(
            Object.clone(http),
            {
              module: OSPollHttp,
              load: ['apps/os/input/os']
            },
          )
  				// {
  				// 	scheme: 'http',
  				// 	host:'elk',
  				// 	port: 8081,
  				// 	module: OSPollHttp,
  				// 	// load: ['apps/info/os/']
          //   load: ['apps/os/input/os']
  				// },
          // {
  				// 	scheme: 'http',
  				// 	host:'dev',
  				// 	port: 8081,
  				// 	module: OSPollHttp,
  				// 	// load: ['apps/info/os/']
          //   load: ['apps/os/input/os']
  				// }
  			],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
  			requests: {
  				// periodical: 1000,
          periodical: function(dispatch){
            // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
            return cron.schedule('* * * * * *', dispatch);//every 20 secs
          },
  			},
  		},
  	},

    {
  		poll: {
  			id: "input.os.procs.http",
  			conn: [
          Object.merge(
            Object.clone(http),
            {
              module: ProcsPollHttp,
              load: ['apps/os/input/procs']
            },
          )
  				// {
  				// 	scheme: 'http',
  				// 	host:'elk',
  				// 	port: 8081,
  				// 	module: ProcsPollHttp,
          //   load: ['apps/os/input/procs']
  				// },
          // {
  				// 	scheme: 'http',
  				// 	host:'dev',
  				// 	port: 8081,
  				// 	module: ProcsPollHttp,
          //   load: ['apps/os/input/procs']
  				// }
  			],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
  			requests: {
  				periodical: 1000,//ms
          // periodical: function(dispatch){
          //   // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
          //   return cron.schedule('* * * * * *', dispatch);//every 20 secs
          // },
  			},
  		},
  	},
    // {
  	// 	poll: {
  	// 		id: "input.os.elk.http",
  	// 		conn: [
    //
    //       {
  	// 				scheme: 'http',
  	// 				host:'elk',
  	// 				port: 8081,
  	// 				module: OSPollHttp,
  	// 				// load: ['apps/info/os/']
    //         load: ['apps/os/input/os']
  	// 			},
    //
  	// 		],
    //     connect_retry_count: -1,
    //     connect_retry_periodical: 1000,
  	// 		requests: {
  	// 			// periodical: 1000,
    //       periodical: function(dispatch){
    //         // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
    //         return cron.schedule('* * * * * *', dispatch);//every 20 secs
    //       },
  	// 		},
  	// 	},
  	// },
    //
    // {
  	// 	poll: {
  	// 		id: "input.os.procs.elk.http",
  	// 		conn: [
  	// 			{
  	// 				scheme: 'http',
  	// 				host:'elk',
  	// 				port: 8081,
  	// 				module: ProcsPollHttp,
    //         load: ['apps/os/input/procs']
  	// 			},
    //
  	// 		],
    //     connect_retry_count: -1,
    //     connect_retry_periodical: 1000,
  	// 		requests: {
  	// 			periodical: 1000,//ms
    //       // periodical: function(dispatch){
    //       //   // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
    //       //   return cron.schedule('* * * * * *', dispatch);//every 20 secs
    //       // },
  	// 		},
  	// 	},
  	// }
   ],
   filters: [
  		// require('./snippets/filter.sanitize.template'),
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts

        let host = input_type.options.id
        let module = app.options.id

        // console.log('os filter',doc)
        // debug(app.options.id)

        // if(app.options.id == 'os.procs'){
        if(app.options.id == 'procs'){

          procs_filter(
            doc,
            opts,
            // function(doc, opts, next, pipeline){
            //   sanitize_filter(
            //     doc,
            //     opts,
            //     // function(doc, opts, next, pipeline){
            //     //   zipson_filter(
            //     //     doc,
            //     //     opts,
            //     //     pipeline.output.bind(pipeline),
            //     //     pipeline
            //     //   )
            //     // },
            //     // function(doc, opts, next, pipeline){
            //     //   lzutf8_filter(
            //     //     doc,
            //     //     opts,
            //     //     pipeline.output.bind(pipeline),
            //     //     pipeline
            //     //   )
            //     // },
            //     // function(doc, opts, next, pipeline){
            //     //   lzstring_filter(
            //     //     doc,
            //     //     opts,
            //     //     pipeline.output.bind(pipeline),
            //     //     pipeline
            //     //   )
            //     // },
            //     // function(doc, opts, next, pipeline){
            //     //   compress_filter(
            //     //     doc,
            //     //     opts,
            //     //     pipeline.output.bind(pipeline),
            //     //     pipeline
            //     //   )
            //     // },
            //     pipeline.output.bind(pipeline),
            //     pipeline
            //   )
            // },
            next,
            pipeline
          )
        }
        else{
          if(doc && doc.uptime)
            pipeline.current_uptime = doc.uptime

          if(doc && doc.networkInterfaces){//create an extra doc for networkInterfaces
            networkInterfaces_filter(
              doc.networkInterfaces,
              opts,
              // function(doc, opts, next, pipeline){
              //   sanitize_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              // },
              next,
              // sanitize_filter,
              pipeline
            )

            delete doc.networkInterfaces

          }



          // sanitize_filter(
          //   doc,
          //   opts,
          //   // function(doc, opts, next, pipeline){
          //   //   zipson_filter(
          //   //     doc,
          //   //     opts,
          //   //     pipeline.output.bind(pipeline),
          //   //     pipeline
          //   //   )
          //   // },
          //   // function(doc, opts, next, pipeline){
          //   //   lzutf8_filter(
          //   //     doc,
          //   //     opts,
          //   //     pipeline.output.bind(pipeline),
          //   //     pipeline
          //   //   )
          //   // },
          //   // function(doc, opts, next, pipeline){
          //   //   lzstring_filter(
          //   //     doc,
          //   //     opts,
          //   //     pipeline.output.bind(pipeline),
          //   //     pipeline
          //   //   )
          //   // },
          //   // function(doc, opts, next, pipeline){
          //   //   compress_filter(
          //   //     doc,
          //   //     opts,
          //   //     pipeline.output.bind(pipeline),
          //   //     pipeline
          //   //   )
          //   // },
          //   pipeline.output.bind(pipeline),
          //   pipeline
          // )

          debug('app.options.id %s', app.options.id)
          if(app.options.id === 'os.mounts'){
            debug('MOUNTS %O', doc)

            doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[0]))}}
          }
          else if(app.options.id === 'os.blockdevices'){
            debug('blockdevices %O', Object.keys(doc[Object.keys(doc)[0]]))
            // process.exit(1)
            doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[Object.keys(doc)[0]]))}}
          }
          else{

            // if(module === 'os'){
            //   debug('OS %o', doc, module)
            //   process.exit(1)
            // }
            doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc))}}
          }
          next(doc)

        }

        // debug_internals(input_type.options.id)

      },

      /**
      * not merge
      **/
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts


        // let host = doc.metadata.host
        // let module = doc.metadata.path

        let timestamp = roundMilliseconds(Date.now())
        doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
        doc.metadata.timestamp = timestamp

        sanitize_filter(
          doc,
          opts,
          pipeline.output.bind(pipeline),
          pipeline
        )

        // if(!modules[host]) modules[host] = Object.clone(all_modules)
        //
        // modules[host][module] = true
        //
        // debug_internals('merge', host, module, modules[host])
        //
        // if(!meta_docs[host]) meta_docs[host] = Object.clone(meta_doc)
        //
        // meta_docs[host].data.push(doc)
        // meta_docs[host].id = host+'.os.merged@'+Date.now()
        // meta_docs[host].metadata['host'] = host
        //
        // if(Object.every(modules[host], function(val, mod){ return val })){
        //   // debug_internals('META %o', meta_docs[host])
        //   // meta_docs[host].data = JSON.stringify(meta_docs[host].data)
        //   sanitize_filter(
        //     Object.clone(meta_docs[host]),
        //     opts,
        //     pipeline.output.bind(pipeline),
        //     pipeline
        //   )
        //
        //   meta_docs[host].data = []
        //   Object.each(modules[host], function(val, mod){ modules[host][mod] = false })
        //
        // }


      },

      /**
      * merge
      **/

      // function(doc, opts, next, pipeline){
      //   let { type, input, input_type, app } = opts
      //
      //
      //   let host = doc.metadata.host
      //   let module = doc.metadata.path
      //
      //   if(!modules[host]) modules[host] = Object.clone(all_modules)
      //
      //   modules[host][module] = true
      //
      //   if(!meta_docs[host]) meta_docs[host] = Object.clone(meta_doc)
      //
      //   meta_docs[host].data.push(doc)
      //   meta_docs[host].id = host+'.os.merged@'+Date.now()
      //   meta_docs[host].metadata['host'] = host
      //
      //   debug_internals('merge', host, module, modules[host])
      //
      //   if(Object.every(modules[host], function(val, mod){ return val })){
      //     debug_internals('META %o', meta_docs[host])
      //     // meta_docs[host].data = JSON.stringify(meta_docs[host].data)
      //     sanitize_filter(
      //       Object.clone(meta_docs[host]),
      //       opts,
      //       pipeline.output.bind(pipeline),
      //       pipeline
      //     )
      //
      //     meta_docs[host].data = []
      //     Object.each(modules[host], function(val, mod){ modules[host][mod] = false })
      //
      //   }
      //
      //
      // }

  	],
  	output: [
      // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
  		//require('./snippets/output.stdout.template'),
  		// {
  		// 	cradle: {
  		// 		id: "output.os.cradle",
  		// 		conn: [
  		// 			{
  		// 				host: 'elk',
  		// 				port: 5984,
  		// 				db: 'live',
  		// 				opts: {
  		// 					cache: false,
  		// 					raw: false,
  		// 					forceSave: false,
  		// 				},
  		// 			},
  		// 		],
  		// 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
      //     buffer:{
  		// 			size: 0,
  		// 			expire:0
  		// 		}
  		// 	}
  		// }
      {
  			rethinkdb: {
  				id: "output.os.rethinkdb",
  				conn: [
            Object.merge(
              Object.clone(out),
              {table: 'os'}
            )
  				],
  				module: require('js-pipeline/output/rethinkdb'),
          buffer:{
  					// size: 1, //-1
  					// expire:0
            // size: -1,
            // size: 100,
            expire: 1001,
            // expire: 5001,
  				}
  			}
  		}
  	]
  }

  return conf
}
