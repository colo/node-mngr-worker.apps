'use strict'

const debug = require('debug')('Server:Apps:Logs:Educativa:Pipeline'),
      debug_internals = require('debug')('Server:Apps:Logs:Educativa:Pipeline:Internals')

let cron = require('node-cron');

const Tail = require('./input/tail')
const STDIN = require('./input/stdin')

//
// const schema = '$remote_addr - $remote_user [$time_local] '
//     + '"$request" $status $body_bytes_sent "$http_referer" '
//     + '"$http_user_agent" "$http_x_forwarded_for"'



const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const parse = require('./filters/parse')

/**
* to test different type of tags
**/

module.exports = function(payload){
  let {input, output, filters, opts} = payload
  let domain = input.domain
  let file = input.file
  let stdin = (input.stdin && input.stdin !== false) ? true : false

  let conf = {
    // parser: new Parser(opts.schema || schema),
    // schema: opts.schema || schema,
    input: [

    ],
    filters: [
      parse
    ],
    output: [
      {
    		rethinkdb: {
    			id: "output.os.rethinkdb",
    			conn: [
    				Object.merge(
              Object.clone(output),
              {table: 'logs'}
            ),
    			],
    			module: require('js-pipeline.output.rethinkdb'),
          // module: require('./output/rethinkdb.geospatial'),
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

  if(stdin === true){
    conf.input.push(
      {
       poll: {
         id: "input.stdin",
          conn: [
            {
              module: STDIN,
              domain: domain,
              log_type: opts.type,
              hostname: opts.hostname,
              // schema: opts.schema || schema,
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
             log_type: opts.type,
             hostname: opts.hostname,
             // schema: opts.schema || schema,
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
