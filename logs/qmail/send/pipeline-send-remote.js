'use strict'

const debug = require('debug')('Server:Apps:Logs:Qmail:Send:Pipeline:SendRemote'),
      debug_internals = require('debug')('Server:Apps:Logs:Qmail:Send:Pipeline:SendRemote:Internals')

let cron = require('node-cron');

const Tail = require('./input/tail')
const STDIN = require('./input/stdin')

// const schema = '$remote_addr - $remote_user [$time_local] '
//     + '"$request" $status $body_bytes_sent "$http_referer" '
//     + '"$http_user_agent" "$http_x_forwarded_for"'

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

/**
* to test different type of tags
**/

let HttpReceiverOutput = require('../../../http-receiver/output')

module.exports = function(payload){
  let {input, output, filters, opts} = payload
  // let domain = input.domain
  let file = input.file
  let stdin = (input.stdin && input.stdin !== false) ? true : false
  // let log_type = opts.type
  // Array.each(filters, function(filter, i){
  //   filters[i] = filter(payload)
  // })

  // const parser = new Parser(opts.schema || schema)

  let conf = {
    // schema: opts.schema || schema,
    input: [

    ],
    filters: [

    ],
    output: [
      {
      	rethinkdb: {
      		id: "output.logs.web.http-client",
      		conn: [
            Object.merge(
              Object.clone(output),
              {
                path: 'logs',
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
              // domain: domain,
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
             // domain: domain,
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
