'use strict'

var debug = require('debug')('Server:Apps:Logs:Nginx:Pipeline')
var debug_internals = require('debug')('Server:Apps:Logs:Nginx:Pipeline:Internals')

const URL = require('url').URL

const path = require('path')
const os = require('os')

const PREFIX =  process.env.NODE_ENV === 'production'
      ? path.resolve(process.cwd(), './')
      : path.resolve(process.cwd(), './devel/')

let cron = require('node-cron');

// const FrontailHttp = require('./input/frontail.http')
// const FrontailIO = require('./input/frontail.io')
const Tail = require('./input/tail')
const STDIN = require('./input/stdin')

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

const cityBuffer = fs.readFileSync(PREFIX+'/var/lib/geoip/GeoLite2-City.mmdb');
const cityReader = Reader.openBuffer(cityBuffer);

// const countryBuffer = fs.readFileSync(PREFIX+'/geoip/GeoLite2-Country.mmdb');
// const countryReader = Reader.openBuffer(countryBuffer);

const uaParser = require('ua-parser2')()
const ip = require('ip')
const qs = require('qs')
const referer = require('referer-parser')

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

/**
* to test different type of tags
**/
let tag_type = 'nginx'

module.exports = function(file, domain, out){
  // let socket_io_input_conf = {
  //   poll: {
  //     // suspended: true,
  //     id: 'input.frontail.io',
  //     conn: [
  //       Object.merge(
  //         Object.clone(frontail),
  //         {
  //           module: FrontailIO,
  //         }
  //       )
  //     ],
  //     connect_retry_count: -1,
  //     connect_retry_periodical: 1000,
  //     requests: {
  //       periodical: 1000
  //     }
  //   }
  // }

  let conf = {
   input: [
     {
   		poll: {
   			id: "input.stdin",
         conn: [
           {
             module: STDIN,
             domain: domain,
           }
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
  			id: "input.tail",
        conn: [
          {
            file: file,
            module: Tail,
            domain: domain,
          }
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
      // function(doc, opts, next, pipeline){
      //   debug_internals('filter doc', doc)
      //   if(doc['socket.io']){
      //     socket_io_input_conf.poll.conn[0].path = doc['socket.io'].ns
      //     socket_io_input_conf.poll.conn[0].domain = doc['socket.io'].domain
      //     let _input = pipeline.__process_input(socket_io_input_conf)
      //
      //     //
      //     pipeline.inputs.push(_input)
      //     // debug_internals('input', _input.options.conn[0].module)
      //     // process.exit(1)
      //     // pipeline.start()
      //     pipeline.__start_input(_input)
      //     //
      //     // // pipeline.fireEvent('onResume')
      //   }
      //   else{
      //     next(doc, opts, next, pipeline)
      //   }
      // },
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

        try  {
          doc.log = doc.log.trim().replace(/(\r\n. |\n. |\r)/g,"")
          let result = parser.parseLine(doc.log)
          result.log = doc.log
          // if(result.time_local)
          //   result.timestamp = moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf()

          result.status *=1
          result.body_bytes_sent *=1

          result.method = result.request.split(' ')[0]
          result.path = result.request.split(' ')[1]
          result.version = result.request.split(' ')[2]
          delete result.request


          if(result.http_referer){
            let r = new referer(result.http_referer, 'http://'+doc.domain)
            // Object.each(r, function(data, key){
            //   debug('referer %s %s', key, data )
            // })
            let uri = r.uri
            result.referer = {
              known: r.known,
              referer: r.referer,
              medium: r.medium,
              search_parameter: r.search_parameter,
              search_term: r.search_term,
              uri: {
                protocol: uri.protocol,
                slashes: uri.slashes,
                auth: uri.auth,
                host: uri.host,
                port: uri.port,
                hostname: uri.hostname,
                hash: uri.hash,
                search: uri.search,
                query: uri.query,
                pathname: uri.pathname,
                path: uri.path,
                href: uri.href
              },
            }
            debug('referer %o', result.referer )
          }
          // process.exit(1)

          let url = new URL(result.path, 'http://'+doc.domain)
          result.pathname = url.pathname
          result.qs = qs.parse(url.search, { ignoreQueryPrefix: true })

          // result.qs = qs.parse(result.query)

          if(result.remote_addr && !ip.isPrivate(result.remote_addr) )
            result.geoip = cityReader.city(result.remote_addr)

          // if(result.http_user_agent && result.http_user_agent)
          // debug('ua', )
          let ua = JSON.parse(JSON.stringify(uaParser.parse(result.http_user_agent)))
          delete ua.string
          // result = Object.merge(result, ua)
          result.user_agent = ua

          // result.country = countryReader.country(result.remote_addr)

          let doc_ts = (result.time_local) ? moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf() : Date.now()
          // let ts = doc_ts
          let ts = Date.now()
          ts += (doc.counter) ? '-'+doc.counter : ''
          // result.timestamp = doc_ts
          delete result.timestamp

          Object.each(result, function(value, key){
            if(value === null || value === undefined)
              delete result[key]
          })

          let new_doc = {
            id: os.hostname()+'.'+opts.input.options.id+'.nginx.'+doc.domain+'@'+ts,
            data: result,
            metadata: {
              host: os.hostname(),
              path: 'logs.nginx.'+doc.domain,
              // path: 'logs.nginx',
              domain: doc.domain,
              timestamp: doc_ts,
              // timestamp: Date.now(),
              // tag: [tag_type, 'web', doc.input],
              tag: ['nginx', 'web', 'protocol', 'url', 'uri', 'schema', doc.input],
              type: 'periodical'
            }
          }

          // debug('parsed line', new_doc.data.geoip.location)
          next(new_doc)
        }
        catch(e){
          debug_internals('error parsing line', e)
          // process.exit(1)
        }
        // debug('PREFIX', PREFIX)
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
  					Object.merge(
              Object.clone(out),
              {table: 'logs'}
            ),
  				],
  				// module: require('js-pipeline.output.rethinkdb'),
          module: require('./output/rethinkdb.geospatial'),
          buffer:{
  					size: -1, //-1
  					// expire:0
            // size: 1000,
            // expire: 999,
            expire: 1000,
            periodical: 500,
  				}
  			}
  		}
  	]
  }

  return conf
}
