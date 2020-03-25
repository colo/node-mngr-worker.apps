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
const schema = '$remote_addr - $remote_user [$time_local] '
    + '"$request" $status $body_bytes_sent "$http_referer" '
    + '"$http_user_agent" "$http_x_forwarded_for"'

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
// let tag_type = 'nginx'

let HttpReceiverOutput = require('../../http-receiver/output')

module.exports = function(payload){
  let {input, output, filters, opts} = payload
  let domain = input.domain
  let file = input.file
  let stdin = (input.stdin && input.stdin !== false) ? true : false
  let log_type = opts.type
  // Array.each(filters, function(filter, i){
  //   filters[i] = filter(payload)
  // })

  const parser = new Parser(opts.schema || schema)

  let conf = {
   input: [

   ],
   filters: [

      // function(doc, opts, next, pipeline){
      //   /**
      //   * to test different type of tags
      //   **/
      //   // tag_type = (tag_type === 'nginx') ? 'apache' : 'nginx'
      //   debug_internals('filters to apply...', doc, opts.input.options.id )
      //   /**
      //   * https://github.com/chriso/nginx-parser
      //   * -> https://github.com/robojones/nginx-log-parser
      //   * https://www.npmjs.com/package/log-analyzer
      //   * https://github.com/nickolanack/node-apache-log
      //   * https://github.com/blarsen/node-alpine
      //   **/
      //   // parser.parseLine(doc.line, function(line){
      //   //   debug('parsed line', line)
      //   // })
      //
      //   try  {
      //     doc.log = doc.log.trim().replace(/(\r\n. |\n. |\r)/g,"")
      //     let result = parser.parseLine(doc.log)
      //     result.log = doc.log
      //     // if(result.time_local)
      //     //   result.timestamp = moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf()
      //
      //     result.status *=1
      //     result.body_bytes_sent *=1
      //
      //     result.method = result.request.split(' ')[0]
      //     result.path = result.request.split(' ')[1]
      //     result.version = result.request.split(' ')[2]
      //     delete result.request
      //
      //
      //     if(result.http_referer){
      //       let r = new referer(result.http_referer, 'http://'+doc.domain)
      //       // Object.each(r, function(data, key){
      //       //   debug('referer %s %s', key, data )
      //       // })
      //       let uri = r.uri
      //       result.referer = {
      //         known: r.known,
      //         referer: r.referer,
      //         medium: r.medium,
      //         search_parameter: r.search_parameter,
      //         search_term: r.search_term,
      //         uri: {
      //           protocol: uri.protocol,
      //           slashes: uri.slashes,
      //           auth: uri.auth,
      //           host: uri.host,
      //           port: uri.port,
      //           hostname: uri.hostname,
      //           hash: uri.hash,
      //           search: uri.search,
      //           query: uri.query,
      //           pathname: uri.pathname,
      //           path: uri.path,
      //           href: uri.href
      //         },
      //       }
      //       debug('referer %o', result.referer )
      //     }
      //     // process.exit(1)
      //
      //     let url = new URL(result.path, 'http://'+doc.domain)
      //     result.pathname = url.pathname
      //     result.qs = qs.parse(url.search, { ignoreQueryPrefix: true })
      //
      //     // result.qs = qs.parse(result.query)
      //
      //     if(result.remote_addr && !ip.isPrivate(result.remote_addr) )
      //       result.geoip = cityReader.city(result.remote_addr)
      //
      //     // if(result.http_user_agent && result.http_user_agent)
      //     // debug('ua', )
      //     let ua = JSON.parse(JSON.stringify(uaParser.parse(result.http_user_agent)))
      //     delete ua.string
      //     // result = Object.merge(result, ua)
      //     result.user_agent = ua
      //
      //     // result.country = countryReader.country(result.remote_addr)
      //
      //     let doc_ts = (result.time_local) ? moment(result.time_local, 'DD/MMM/YYYY:HH:mm:ss Z').valueOf() : Date.now()
      //     // let ts = doc_ts
      //     let ts = Date.now()
      //     ts += (doc.counter) ? '-'+doc.counter : ''
      //     // result.timestamp = doc_ts
      //     delete result.timestamp
      //
      //     Object.each(result, function(value, key){
      //       if(value === null || value === undefined)
      //         delete result[key]
      //     })
      //
      //     let new_doc = {
      //       id: os.hostname()+'.'+opts.input.options.id+'.'+log_type+'.'+doc.domain+'@'+ts,
      //       data: result,
      //       metadata: {
      //         host: os.hostname(),
      //         // path: 'logs.nginx.'+doc.domain,
      //         path: 'logs.'+log_type,
      //         domain: doc.domain,
      //         timestamp: doc_ts,
      //         // timestamp: Date.now(),
      //         // tag: [tag_type, 'web', doc.input],
      //         tag: [log_type, 'web', 'protocol', 'url', 'uri', 'schema', doc.input],
      //         type: 'periodical'
      //       }
      //     }
      //
      //     // debug('parsed line', new_doc.data.geoip.location)
      //     next(new_doc)
      //   }
      //   catch(e){
      //     debug_internals('error parsing line', e)
      //     // process.exit(1)
      //   }
      //   // debug('PREFIX', PREFIX)
      // },


  	],
  	output: [
      // {
  		// 	rethinkdb: {
  		// 		id: "output.os.rethinkdb",
  		// 		conn: [
  		// 			Object.merge(
      //         Object.clone(output),
      //         {table: 'logs'}
      //       ),
  		// 		],
  		// 		// module: require('js-pipeline.output.rethinkdb'),
      //     module: require('./output/rethinkdb.geospatial'),
      //     buffer:{
  		// 			size: -1, //-1
  		// 			// expire:0
      //       // size: 1000,
      //       // expire: 999,
      //       expire: 1000,
      //       periodical: 500,
  		// 		}
  		// 	}
  		// }
      {
  			rethinkdb: {
  				id: "output.logs.web.http-client",
  				conn: [
            Object.merge(
              Object.clone(output),
              {
                path: 'logs',
                // authentication: {
            		// 	username: 'mngr',
            		// 	password: '1234',
            		// 	sendImmediately: true,
            		// 	// bearer: 'bearer',
            		// 	basic: true
            		// },
              }
            )
  				],
  				module: HttpReceiverOutput,
          buffer:{
  					// // size: 1, //-1
  					// expire: 1001,
            size: -1, //-1
  					// expire: 0 //ms
            expire: 1000, //ms
            periodical: 500 //how often will check if buffer timestamp has expire
  				}
  			}
  		}
  	]
  }

  if(stdin === true){
    conf.input.push(
      {
       poll: {
         id: "input.stdin",
          conn: [
            {
              module: STDIN,
              domain: domain,
              log_type: log_type,
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
      }
    )
  }

  if(file){
    conf.input.push(
      {
       poll: {
         id: "input.tail",
         conn: [
           {
             file: file,
             module: Tail,
             domain: domain,
             log_type: log_type,
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
      }
    )
  }


  return conf
}
