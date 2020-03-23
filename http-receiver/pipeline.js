'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Pipeline'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Pipeline:Internals')

const path = require('path');

// let cron = require('node-cron');

// let procs_filter = require('./filters/proc'),
//     networkInterfaces_filter = require('./filters/networkInterfaces'),
//     blockdevices_filter = require('./filters/blockdevices'),
//     cpus_filter = require('./filters/cpus'),
//     mounts_filter = require('./filters/mounts'),
//     // data_formater_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.data_formater')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
//     compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))
//
//     // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
//     // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
//     // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))
//

require('http').globalAgent.maxSockets = Infinity
require('https').globalAgent.maxSockets = Infinity

const HttpServerInput = require('./input/')

// let HttpServer = require('js-pipeline.input.http-server')
//
// // const App = require('node-express-app'),
// // 			os = require('os'),
// const bodyParser = require('body-parser'),
// 			cors = require('cors');
//
// const HttpReceiver = new Class({
//   Extends: HttpServer,
//
//   options: {
//     // host: '127.0.0.1',
//     // port: 8080,
// 		id: 'HttpReceiver',
// 		path: '/',
//
// 		authentication: {
// 			users : [
// 					{ id: 1, username: 'anonymous' , role: 'anonymous', password: ''}
// 			],
// 		},
//
// 		logs: null,
//
// 		//authorization: {
// 			//config: path.join(__dirname,'./rbac.json'),
// 		//},
//
// 		// params: {
// 		// 	event: /exit|resume|suspend|once|range/
// 		// },
//
// 		middlewares: [
// 			bodyParser.json(),
// 			bodyParser.urlencoded({ extended: true }),
// 			cors({
// 				'exposedHeaders': ['Link', 'Content-Range']
// 			})
// 	  ],
//
// 		// api: {
//     //
// 		// 	version: '1.0.0',
//     //
//     //
// 		// 	// routes: {
// 		// 	// 	// get: [
// 		// 	// 	// 	{
// 		// 	// 	// 		path: 'pollers',
// 		// 	// 	// 		callbacks: ['pollers'],
// 		// 	// 	// 		version: '',
// 		// 	// 	// 	},
// 		// 	// 	// 	{
// 		// 	// 	// 		path: 'events/:event',
// 		// 	// 	// 		callbacks: ['events'],
// 		// 	// 	// 		version: '',
// 		// 	// 	// 	},
// 		// 	// 	// 	{
// 		// 	// 	// 		path: 'events',
// 		// 	// 	// 		callbacks: ['events'],
// 		// 	// 	// 		version: '',
// 		// 	// 	// 	},
// 		// 	// 	// 	{
// 		// 	// 	// 		path: '',
// 		// 	// 	// 		callbacks: ['get'],
// 		// 	// 	// 		version: '',
// 		// 	// 	// 	},
// 		// 	// 	// ],
// 		// 	// 	all: [
// 		// 	// 		{
// 		// 	// 			path: '',
// 		// 	// 			callbacks: ['404'],
// 		// 	// 			version: '',
// 		// 	// 		},
// 		// 	// 	]
// 		// 	// },
//     //
// 		// },
//
//     // api: {
//     //
// 		// 	version: '1.0.0',
//     //
// 		// 	routes: {
// 		// 		get: [
// 		// 			{
// 		// 				path: ':prop',
// 		// 				callbacks: ['404'],
// 		// 				//version: '',
// 		// 			},
// 		// 			{
// 		// 				path: '',
// 		// 				callbacks: ['404'],
// 		// 				//version: '',
// 		// 			},
// 		// 		]
// 		// 	},
//     //
// 		// },
//   },
//   get: function (err, resp, body, req){
//   }
// })
// let OSPollHttp = require('node-app-http-client/load')(PollHttp)
// let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)


// const roundMilliseconds = function(timestamp){
//   let d = new Date(timestamp)
//   d.setMilliseconds(0)
//
//   return d.getTime()
// }
//
// // const CONF = process.env.NODE_ENV === 'production'
// //       ? require('./etc/http/prod.conf')
// //       : require('./etc/http/dev.conf');

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
  		// require('./snippets/filter.sanitize.template'),
      // function(doc, opts, next, pipeline){
      //   let { type, input, input_type, app } = opts
      //
      //   let host = input_type.options.id
      //   let module = app.options.id
      //
      //   // console.log('os filter',doc)
      //   // debug(app.options.id)
      //
      //   // if(app.options.id == 'os.procs'){
      //   if(app.options.id == 'procs'){
      //
      //     procs_filter(
      //       doc,
      //       opts,
      //       next,
      //       pipeline
      //     )
      //   }
      //   else{
      //     if(doc && doc.uptime)
      //       pipeline.current_uptime = doc.uptime
      //
      //     if(doc && doc.networkInterfaces){//create an extra doc for networkInterfaces
      //       networkInterfaces_filter(
      //         doc.networkInterfaces,
      //         opts,
      //         next,
      //         pipeline
      //       )
      //
      //       delete doc.networkInterfaces
      //
      //     }
      //
      //     debug('app.options.id %s', app.options.id)
      //     if(app.options.id === 'os.mounts'){
      //       debug('MOUNTS %O', doc)
      //
      //       mounts_filter(
      //         doc,
      //         opts,
      //         next,
      //         pipeline
      //       )
      //
      //       // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[0]))}}
      //       //
      //       // next(doc)
      //     }
      //     else if(app.options.id === 'os.blockdevices'){
      //       blockdevices_filter(
      //         doc,
      //         opts,
      //         next,
      //         pipeline
      //       )
      //
      //       // debug('blockdevices %O', Object.keys(doc[Object.keys(doc)[0]]))
      //       // // process.exit(1)
      //       // Object.each(doc, function(_doc, device){
      //       //   next({data: _doc, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc))}})
      //       // })
      //       // // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[Object.keys(doc)[0]]))}}
      //       // //
      //       // // next(doc)
      //     }
      //     else{
      //
      //
      //
      //       let memdoc = {data: {}, metadata: {host: host, path: module+'.memory', tag: ['os']}}
      //       Object.each(doc, function(_doc, key){
      //         if(/mem/.test(key)){
      //           memdoc.metadata.tag.push(key)
      //           memdoc.data[key] = _doc
      //         }
      //         else if(key === 'cpus'){
      //           cpus_filter(
      //             _doc,
      //             opts,
      //             next,
      //             pipeline
      //           )
      //         }
      //         else if(key === 'loadavg'){
      //           let _tmp = Array.clone(_doc)
      //           _doc = {
      //             '1_min': _tmp[0],
      //             '5_min': _tmp[1],
      //             '15_min': _tmp[2]
      //           }
      //
      //           next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
      //         }
      //         else if(key === 'uptime'){
      //           let _tmp = _doc
      //           _doc = {
      //             seconds: _tmp
      //           }
      //
      //           next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
      //         }
      //         else{
      //           next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
      //         }
      //       })
      //
      //       if(Object.getLength(memdoc.data) > 0){
      //         next(memdoc)
      //       }
      //       // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc))}}
      //     }
      //
      //     // next(doc)
      //
      //   }
      //
      //   // debug_internals(input_type.options.id)
      //
      // },



  	],
  	output: [
      require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),

  	]
  }

  return conf
}
