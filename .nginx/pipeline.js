'use strict'


var debug = require('debug')('Server:Apps:Nginx:Pipeline')
var debug_internals = require('debug')('Server:Apps:Nginx:Pipeline:Internals')

const url = require('url')

const path = require('path')
const os = require('os')

const ETC =  process.env.NODE_ENV === 'production'
      ? path.resolve(process.cwd(), './etc/')
      : path.resolve(process.cwd(), './devel/etc/')

let cron = require('node-cron');

const FrontailHttp = require('./input/frontail.http')
const FrontailIO = require('./input/frontail.io')

// const NginxParser = require('nginxparser')
//
// let parser = new NginxParser('$remote_addr - $remote_user [$time_local] '
// 		+ '"$request" $status $body_bytes_sent "$http_referer" '
//     + '"$http_user_agent" "$http_x_forwarded_for"')

const Parser =require('@robojones/nginx-log-parser').Parser
const parser = new Parser('$remote_addr - $remote_user [$time_local] '
		+ '"$request" $status $body_bytes_sent "$http_referer" '
    + '"$http_user_agent" "$http_x_forwarded_for"')

const moment = require ('moment')

const fs = require('fs');
const Reader = require('@maxmind/geoip2-node').Reader;

const cityBuffer = fs.readFileSync(ETC+'/geoip/GeoLite2-City.mmdb');
const cityReader = Reader.openBuffer(cityBuffer);

// const countryBuffer = fs.readFileSync(ETC+'/geoip/GeoLite2-Country.mmdb');
// const countryReader = Reader.openBuffer(countryBuffer);

const uaParser = require('ua-parser2')()
const ip = require('ip')



// let procs_filter = require('./filters/proc'),
//     networkInterfaces_filter = require('./filters/networkInterfaces'),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
//     compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))
//
//     // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
//     // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
//     // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))



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

let socket_io_input = {
  poll: {
    // suspended: true,
    id: 'input.frontail.io',
    conn: [
      {
        scheme: 'http',
        host:'127.0.0.1',
        port: 9001,
        module: FrontailIO,
        // load: ['apps/info/os/']
        // load: ['apps/frontail/input/os']
      },
    ],
    connect_retry_count: -1,
    connect_retry_periodical: 1000,
    requests: {
      periodical: 1000
    }
  }
}

/**
* to test different type of tags
**/
let tag_type = 'nginx'

module.exports = {
 input: [
	{
		poll: {
			id: "input.frontail.http",
      conn: [
				{
					scheme: 'http',
					host:'127.0.0.1',
					port: 9001,
					module: FrontailHttp,
          domain: 'formacion.cetrogar.com.ar',
          // load: ['apps/info/os/']
          // load: ['apps/frontail/input/os']
				},

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


 ],
 filters: [
		// require('./snippets/filter.sanitize.template'),
    function(doc, opts, next, pipeline){
      debug_internals('filter doc', doc)
      if(doc['socket.io']){
        socket_io_input.poll.conn[0].path = doc['socket.io'].ns
        socket_io_input.poll.conn[0].domain = doc['socket.io'].domain
        let _input = pipeline.__process_input(socket_io_input)

        debug_internals('input', _input)

        pipeline.inputs.push(_input)
        pipeline.start()
        // pipeline.__start_input(_input)

        // pipeline.fireEvent('onResume')
      }
      else{
        next(doc, opts, next, pipeline)
      }
    },
    function(doc, opts, next, pipeline){
      /**
      * to test different type of tags
      **/
      tag_type = (tag_type === 'nginx') ? 'apache' : 'nginx'
      debug_internals('filters to apply...', doc, opts.input.options.id )
      /**
      * https://github.com/chriso/nginx-parser
      * -> https://github.com/robojones/nginx-log-parser
      * https://www.npmjs.com/package/log-analyzer
      * https://github.com/nickolanack/node-apache-log
      * https://github.com/blarsen/node-alpine
      **/
      // parser.parseLine(doc.line, function(line){
      //   debug('parsed line', line)
      // })

      let result = parser.parseLine(doc.log)
      result.log = doc.log
      // if(result.time_local)
      //   result.timestamp = moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf()

      result.status *=1
      result.body_bytes_sent *=1

      if(result.remote_addr && !ip.isPrivate(result.remote_addr) )
        result.geoip = cityReader.city(result.remote_addr)

      // if(result.http_user_agent && result.http_user_agent)
      // debug('ua', )
      let ua = JSON.parse(JSON.stringify(uaParser.parse(result.http_user_agent)))
      delete ua.string
      result = Object.merge(result, ua)

      // result.country = countryReader.country(result.remote_addr)

      let ts = (result.time_local) ? moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf() : Date.now()



      let new_doc = {
        id: os.hostname()+'.'+opts.input.options.id+'.nginx.'+doc.domain+'@'+ts,
        data: result,
        metadata: {
          host: os.hostname(),
          path: 'frontail',
          domain: doc.domain,
          timestamp: Date.now(),
          tags: [tag_type, 'log'],
          // tags: ['nginx', 'log'],
          type: 'periodical'
        }
      }

      // debug('parsed line', new_doc.data.geoip.location)
      next(new_doc)

      // debug('ETC', ETC)
    },
    // function(doc, opts, next, pipeline){
    //   let { type, input, input_type, app } = opts
    //
    //   let host = input_type.options.id
    //   let module = app.options.id
    //
    //   // console.log('os filter',doc)
    //
    //   // if(app.options.id == 'os.procs'){
    //   if(app.options.id == 'procs'){
    //     procs_filter(
    //       doc,
    //       opts,
    //       // function(doc, opts, next, pipeline){
    //       //   sanitize_filter(
    //       //     doc,
    //       //     opts,
    //       //     // function(doc, opts, next, pipeline){
    //       //     //   zipson_filter(
    //       //     //     doc,
    //       //     //     opts,
    //       //     //     pipeline.output.bind(pipeline),
    //       //     //     pipeline
    //       //     //   )
    //       //     // },
    //       //     // function(doc, opts, next, pipeline){
    //       //     //   lzutf8_filter(
    //       //     //     doc,
    //       //     //     opts,
    //       //     //     pipeline.output.bind(pipeline),
    //       //     //     pipeline
    //       //     //   )
    //       //     // },
    //       //     // function(doc, opts, next, pipeline){
    //       //     //   lzstring_filter(
    //       //     //     doc,
    //       //     //     opts,
    //       //     //     pipeline.output.bind(pipeline),
    //       //     //     pipeline
    //       //     //   )
    //       //     // },
    //       //     // function(doc, opts, next, pipeline){
    //       //     //   compress_filter(
    //       //     //     doc,
    //       //     //     opts,
    //       //     //     pipeline.output.bind(pipeline),
    //       //     //     pipeline
    //       //     //   )
    //       //     // },
    //       //     pipeline.output.bind(pipeline),
    //       //     pipeline
    //       //   )
    //       // },
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
    //         // function(doc, opts, next, pipeline){
    //         //   sanitize_filter(
    //         //     doc,
    //         //     opts,
    //         //     pipeline.output.bind(pipeline),
    //         //     pipeline
    //         //   )
    //         // },
    //         next,
    //         // sanitize_filter,
    //         pipeline
    //       )
    //
    //       delete doc.networkInterfaces
    //
    //     }
    //
    //
    //
    //     // sanitize_filter(
    //     //   doc,
    //     //   opts,
    //     //   // function(doc, opts, next, pipeline){
    //     //   //   zipson_filter(
    //     //   //     doc,
    //     //   //     opts,
    //     //   //     pipeline.output.bind(pipeline),
    //     //   //     pipeline
    //     //   //   )
    //     //   // },
    //     //   // function(doc, opts, next, pipeline){
    //     //   //   lzutf8_filter(
    //     //   //     doc,
    //     //   //     opts,
    //     //   //     pipeline.output.bind(pipeline),
    //     //   //     pipeline
    //     //   //   )
    //     //   // },
    //     //   // function(doc, opts, next, pipeline){
    //     //   //   lzstring_filter(
    //     //   //     doc,
    //     //   //     opts,
    //     //   //     pipeline.output.bind(pipeline),
    //     //   //     pipeline
    //     //   //   )
    //     //   // },
    //     //   // function(doc, opts, next, pipeline){
    //     //   //   compress_filter(
    //     //   //     doc,
    //     //   //     opts,
    //     //   //     pipeline.output.bind(pipeline),
    //     //   //     pipeline
    //     //   //   )
    //     //   // },
    //     //   pipeline.output.bind(pipeline),
    //     //   pipeline
    //     // )
    //     next({data: doc, metadata: {host: host, path: module}})
    //
    //   }
    //
    //   // debug_internals(input_type.options.id)
    //
    // },

    /**
    * not merge
    **/
    // function(doc, opts, next, pipeline){
    //   let { type, input, input_type, app } = opts
    //
    //
    //   // let host = doc.metadata.host
    //   // let module = doc.metadata.path
    //
    //   let timestamp = roundMilliseconds(Date.now())
    //   doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
    //   doc.metadata.timestamp = timestamp
    //
    //   sanitize_filter(
    //     doc,
    //     opts,
    //     pipeline.output.bind(pipeline),
    //     pipeline
    //   )
    //
    //   // if(!modules[host]) modules[host] = Object.clone(all_modules)
    //   //
    //   // modules[host][module] = true
    //   //
    //   // debug_internals('merge', host, module, modules[host])
    //   //
    //   // if(!meta_docs[host]) meta_docs[host] = Object.clone(meta_doc)
    //   //
    //   // meta_docs[host].data.push(doc)
    //   // meta_docs[host].id = host+'.os.merged@'+Date.now()
    //   // meta_docs[host].metadata['host'] = host
    //   //
    //   // if(Object.every(modules[host], function(val, mod){ return val })){
    //   //   // debug_internals('META %o', meta_docs[host])
    //   //   // meta_docs[host].data = JSON.stringify(meta_docs[host].data)
    //   //   sanitize_filter(
    //   //     Object.clone(meta_docs[host]),
    //   //     opts,
    //   //     pipeline.output.bind(pipeline),
    //   //     pipeline
    //   //   )
    //   //
    //   //   meta_docs[host].data = []
    //   //   Object.each(modules[host], function(val, mod){ modules[host][mod] = false })
    //   //
    //   // }
    //
    //
    // }

    /**
    * merge
    **/



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
					{
            host: 'elk',
						port: 28015,
						db: 'logs',
            table: 'periodical',
					},
				],
				// module: require('js-pipeline.output.rethinkdb'),
        module: require('./output/rethinkdb.geospatial'),
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
