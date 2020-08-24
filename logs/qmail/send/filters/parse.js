'use strict'

const debug = require('debug')('Server:Apps:Logs:Qmail:Send:Filter:Parse'),
      debug_internals = require('debug')('Server:Apps:Logs:Qmail:Send:Filter:Parse:Internals')

// const URL = require('url').URL
//
// const Parser =require('@robojones/nginx-log-parser').Parser

// const moment = require ('moment')

const fs = require('fs');
// const Reader = require('@maxmind/geoip2-node').Reader;

const path = require('path')

const PREFIX =  process.env.NODE_ENV === 'production'
      ? path.resolve(process.cwd(), './')
      : path.resolve(process.cwd(), './devel/')

// const cityBuffer = fs.readFileSync(PREFIX+'/var/lib/geoip/GeoLite2-City.mmdb');
// const cityReader = Reader.openBuffer(cityBuffer);
//
// // const countryBuffer = fs.readFileSync(PREFIX+'/geoip/GeoLite2-Country.mmdb');
// // const countryReader = Reader.openBuffer(countryBuffer);
//
// const uaParser = require('ua-parser2')()
// const ip = require('ip')
// const qs = require('qs')
// const referer = require('referer-parser')
//
// let parser

// const csv = require('csvtojson')
// const TAI64 = require('tai64').TAI64
// const Convert = require ('qmail-logs-to-csv/lib/Convert')
const time = function(tai64n) {
  const seconds = parseInt(tai64n.slice(2, 17), 16) - 10
  const milliseconds = (parseInt(tai64n.slice(17, 25), 16) * 0.000000001).toFixed(3).toString().split('.')[1]

  // const timestamp = new Date(Number(`${seconds}${milliseconds}`)).toISOString()
  const timestamp = Number(`${seconds}${milliseconds}`)
  return timestamp
}

const getTimestamp = function (log) {
  const tai64n = log.match(/^(@.+?)(\s)/)

  if (!tai64n || !tai64n[1]) {
    return null
  }

  const timestamp = time(tai64n[1])
  return timestamp
}

// const schema = 'cgi|start|end|user|course|type|action'

module.exports = function(doc, opts, next, pipeline){
  // debug('parse', doc)
  // process.exit(1)
  /**
  * to test different type of tags
  **/
  // tag_type = (tag_type === 'nginx') ? 'apache' : 'nginx'
  // debug_internals('filters to apply...', doc, opts.input.options.id )


  // try  {
    // const parser = new Parser(pipeline.schema)
    // if(parser === undefined) parser = new Parser(pipeline.options.schema)

    // doc.log = schema + '\n' + doc.log
    // debug('parse %s', doc.log)
    // process.exit(1)

    // let timestamp = getTimestamp(doc.log)
    let arr = doc.log.split(' ')
    debug('parse %o', arr)

    let type, data

    switch (arr[1]) {
      case 'status:':
        type = 'status'
        data = {
          local: {
            used: arr[3].split('/')[0],
            max: arr[3].split('/')[1],
          },
          remote: {
            used: arr[5].split('/')[0],
            max: arr[5].split('/')[1],
          },
        }
        break;

      case 'new':
        type = 'msg.new'
        data = {
          msg: arr[3] * 1
        }

        break;

      case 'end':
        type = 'msg.end'
        data = {
          msg: arr[3] * 1
        }

        break;

      case 'bounce':
        type = 'msg.bounce'
        data = {
          msg: arr[3] * 1,
          qp: arr[5] * 1,
        }

        break;

      case 'info':
        type = 'msg.info'
        data = {
          msg: arr[3].replace(':', '') * 1,
          bytes: arr[5] * 1,
          from: arr[7],
          qp: arr[9] * 1,
          uid: arr[11] * 1
        }

        break;

      case 'starting':
        type = 'delivery.starting'
        data = {
          id: arr[3].replace(':', '') * 1,
          msg: arr[5] * 1,
          type: arr[7],
          to: arr[8]
        }
        break;

      case 'delivery':
        type = 'delivery.status'
        data = {
          id: arr[2].replace(':', '') * 1,
          status: arr[3].replace(':', ''),
          response: arr[4],
        }
        break;
      default:

    }

    if(type !== undefined){
      debug('LOG', type, data)
      data.tai64 = arr[0]

      // data.log = doc.log

      let timestamp = getTimestamp(doc.log)
      let doc_ts = (isNaN(timestamp)) ?  Date.now() : timestamp

      let ts = Date.now()
      ts += (doc.counter) ? '-'+doc.counter : ''

      // Object.each(result, function(value, key){
      //   if(value === null || value === undefined)
      //     delete result[key]
      // })

      let new_doc = {
        id: doc.hostname+'.'+opts.input.options.id+'.'+doc.log_type+'.'+type+'@'+ts,
        data: data,
        metadata: {
          host: doc.hostname,
          // path: 'logs.nginx.'+doc.domain,
          path: 'logs.'+doc.log_type,
          domain: type,
          timestamp: doc_ts,
          _timestamp: Date.now(), //doc creation
          tag: [doc.log_type, type, doc.input],
          type: 'periodical'
        }
      }

      // if(type !== 'status' && type !== 'delivery.starting' && type !== 'msg.new' && type !== 'msg.info'){
      //   debug('parsed line', new_doc)
      //   process.exit(1)
      // }

      next(new_doc)
    }


}
