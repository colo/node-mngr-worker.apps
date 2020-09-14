'use strict'

var debug = require('debug')('Server:Apps:OS:Pipeline');
var debug_internals = require('debug')('Server:Apps:OS:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

let procs_filter = require('./filters/proc'),
    networkInterfaces_filter = require('./filters/networkInterfaces'),
    blockdevices_filter = require('./filters/blockdevices'),
    cpus_filter = require('./filters/cpus'),
    mounts_filter = require('./filters/mounts'),
    host_filter = require('./filters/host'),
    // data_formater_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.data_formater')),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline.input.httpclient')

let OSPollHttp = require('node-app-http-client/load')(PollHttp)
let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)

let JSPipelineOutput = require('js-pipeline.output.rethinkdb')
// let HttpReceiverOutput = require('../http-receiver/output')

/**
* for merged docs
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
**/

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

// const CONF = process.env.NODE_ENV === 'production'
//       ? require('./etc/http/prod.conf')
//       : require('./etc/http/dev.conf');

module.exports = function(http, out){
  const os_output_opts = {
    id: "output.os.rethinkdb",
    conn: [
      Object.merge(
        Object.clone(out),
        {table: 'os'}
      )
    ],
    module: JSPipelineOutput,
    buffer:{
      // // size: 1, //-1
      // expire: 1001,
      size: -1, //-1
      // expire: 0 //ms
      expire: 1000, //ms
      periodical: 500 //how often will check if buffer timestamp has expire
    }
  }

  const os_output = new JSPipelineOutput(os_output_opts)

  const hosts_output_opts = {
    id: "output.host.rethinkdb",
    conn: [
      Object.merge(
        Object.clone(out),
        {table: 'hosts'}
      )
    ],
    module: JSPipelineOutput,
    buffer:{
      // // size: 1, //-1
      // expire: 1001,
      size: -1, //-1
      // expire: 0 //ms
      expire: 1000, //ms
      periodical: 500 //how often will check if buffer timestamp has expire
    }
  }

  const hosts_output = new JSPipelineOutput(hosts_output_opts)

  let conf = {
   input: [
  	{
  		poll: {
  			id: "input.localhost.os.http",
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

    // {
  	// 	poll: {
  	// 		id: "input.localhost.os.procs.http",
  	// 		conn: [
    //       Object.merge(
    //         Object.clone(http),
    //         {
    //           module: ProcsPollHttp,
    //           load: ['apps/os/input/procs']
    //         },
    //       )
  	// 			// {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'elk',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// },
    //       // {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'dev',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// }
  	// 		],
    //     connect_retry_count: -1,
    //     connect_retry_periodical: 1000,
  	// 		requests: {
  	// 			periodical: 250,//ms
    //       // periodical: function(dispatch){
    //       //   // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
    //       //   return cron.schedule('* * * * * *', dispatch);//every 20 secs
    //       // },
  	// 		},
  	// 	},
  	// },

    // {
  	// 	poll: {
  	// 		id: "input.elk.os.http",
  	// 		conn: [
    //       Object.merge(
    //         Object.clone(http),
    //         {
    //           host: 'elk',
    //           module: OSPollHttp,
    //           load: ['apps/os/input/os']
    //         },
    //       )
  	// 			// {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'elk',
  	// 			// 	port: 8081,
  	// 			// 	module: OSPollHttp,
  	// 			// 	// load: ['apps/info/os/']
    //       //   load: ['apps/os/input/os']
  	// 			// },
    //       // {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'dev',
  	// 			// 	port: 8081,
  	// 			// 	module: OSPollHttp,
  	// 			// 	// load: ['apps/info/os/']
    //       //   load: ['apps/os/input/os']
  	// 			// }
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

    // {
  	// 	poll: {
  	// 		id: "input.elk.os.procs.http",
  	// 		conn: [
    //       Object.merge(
    //         Object.clone(http),
    //         {
    //           host: 'elk',
    //           module: ProcsPollHttp,
    //           load: ['apps/os/input/procs']
    //         },
    //       )
  	// 			// {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'elk',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// },
    //       // {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'dev',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// }
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
  	// },
   ],
   filters: [
  		// require('./snippets/filter.sanitize.template'),
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts

        // debug('1st filter %o', doc, opts)
        // if(opts.type === 'once')
        //   process.exit(1)

        let host = input_type.options.id
        let module = app.options.id

        // console.log('os filter',doc)
        // debug(app.options.id)

        // if(app.options.id == 'os.procs'){

        if(app.options.id == 'procs'){

          procs_filter(
            doc,
            opts,
            next,
            pipeline
          )
        }
        else{
          if(doc && doc.uptime)
            pipeline.current_uptime = doc.uptime

          // if(doc && doc.networkInterfaces && opts.type !== 'once'){//create an extra doc for networkInterfaces
          //   networkInterfaces_filter(
          //     doc.networkInterfaces,
          //     opts,
          //     next,
          //     pipeline
          //   )
          //
          //   delete doc.networkInterfaces
          //
          // }

          debug('app.options.id %s', app.options.id)
          if(app.options.id === 'os.mounts'){
            debug('MOUNTS %O', doc)

            mounts_filter(
              doc,
              opts,
              next,
              pipeline
            )

            // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[0]))}}
            //
            // next(doc)
          }
          else if(app.options.id === 'os.blockdevices'){
            blockdevices_filter(
              doc,
              opts,
              next,
              pipeline
            )

            // debug('blockdevices %O', Object.keys(doc[Object.keys(doc)[0]]))
            // // process.exit(1)
            // Object.each(doc, function(_doc, device){
            //   next({data: _doc, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc))}})
            // })
            // // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[Object.keys(doc)[0]]))}}
            // //
            // // next(doc)
          }
          else{
            if(doc && doc.networkInterfaces && opts.type !== 'once'){//create an extra doc for networkInterfaces
              networkInterfaces_filter(
                doc.networkInterfaces,
                opts,
                next,
                pipeline
              )

              delete doc.networkInterfaces

            }
            
            if(opts.type === 'once'){
              // debug('HOST %s', JSON.stringify(doc), opts)
            	// process.exit(1)
              host_filter(doc, opts, next, pipeline)
            }
            else{
              let memdoc = {data: {}, metadata: {host: host, path: module+'.memory', tag: ['os']}}
              Object.each(doc, function(_doc, key){
                if(/mem/.test(key)){
                  memdoc.metadata.tag.push(key)
                  memdoc.data[key] = _doc
                }
                else if(key === 'cpus'){
                  cpus_filter(
                    _doc,
                    opts,
                    next,
                    pipeline
                  )
                }
                else if(key === 'loadavg'){
                  let _tmp = Array.clone(_doc)
                  _doc = {
                    '1_min': _tmp[0],
                    '5_min': _tmp[1],
                    '15_min': _tmp[2]
                  }

                  next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
                }
                else if(key === 'uptime'){
                  let _tmp = _doc
                  _doc = {
                    seconds: _tmp
                  }

                  next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
                }
                else{
                  next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
                }
              })

              if(Object.getLength(memdoc.data) > 0){
                next(memdoc)
              }
            }
          }

          // next(doc)

        }

        // debug_internals(input_type.options.id)

      },

      /**
      * not merge
      **/
      /**
      * convert to tabular data
      **/
      // function(doc, opts, next, pipeline){
      //   let { type, input, input_type, app } = opts
      //
      //
      //
      //   let timestamp = roundMilliseconds(Date.now())
      //   doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
      //   doc.metadata.timestamp = timestamp
      //
      //   debug('last filter %o', doc)
      //   data_formater_filter(doc, 'tabular', process.cwd()+'/apps/os/libs/', function(data){
      //     debug('result %o', data)
      //     let key = Object.keys(data)[0]
      //     doc.data = data[key]
      //     doc.metadata.format = 'tabular'
      //     sanitize_filter(
      //       doc,
      //       opts,
      //       pipeline.output.bind(pipeline),
      //       pipeline
      //     )
      //     // process.exit(1)
      //   })
      //
      // },
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts

        let timestamp = roundMilliseconds(Date.now())

        if(opts.type === 'once'){
          // debug('1st filter %s', JSON.stringify(doc), opts)
          // process.exit(1)
          doc.id = doc.metadata.host+'.'+doc.metadata.path
        }
        else{
          doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
        }

        // let timestamp = roundMilliseconds(Date.now())
        // doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
        doc.metadata.timestamp = timestamp

        sanitize_filter(
          doc,
          opts,
          pipeline.output.bind(pipeline),
          pipeline
        )

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

      function(doc, opts){
        // debug('1st filter %s', JSON.stringify(doc), opts, hosts_output, os_output)
        // process.exit(1)

        if(doc.metadata.path === 'host'){
          hosts_output.fireEvent(hosts_output.ON_SAVE_DOC, doc)
        }
        else{
          os_output.fireEvent(hosts_output.ON_SAVE_DOC, doc)
        }
      }
      // {
  		// 	rethinkdb: {
  		// 		id: "output.os.rethinkdb",
  		// 		conn: [
      //       Object.merge(
      //         Object.clone(out),
      //         {table: 'os'}
      //       )
  		// 		],
  		// 		module: require('js-pipeline.output.rethinkdb'),
      //     buffer:{
  		// 			// // size: 1, //-1
  		// 			// expire: 1001,
      //       size: -1, //-1
  		// 			// expire: 0 //ms
      //       expire: 1000, //ms
      //       periodical: 500 //how often will check if buffer timestamp has expire
  		// 		}
  		// 	}
  		// }

      // {
  		// 	rethinkdb: {
  		// 		id: "output.os.http-client",
  		// 		conn: [
      //       Object.merge(
      //         Object.clone(out),
      //         {
      //           path: 'os',
      //           authentication: {
      //       			username: 'mngr',
      //       			password: '1234',
      //       			sendImmediately: true,
      //       			// bearer: 'bearer',
      //       			basic: true
      //       		},
      //         }
      //       )
  		// 		],
  		// 		module: HttpReceiverOutput,
      //     buffer:{
  		// 			// // size: 1, //-1
  		// 			// expire: 1001,
      //       size: -1, //-1
  		// 			// expire: 0 //ms
      //       expire: 1000, //ms
      //       periodical: 500 //how often will check if buffer timestamp has expire
  		// 		}
  		// 	}
  		// }
  	]
  }

  return conf
}
