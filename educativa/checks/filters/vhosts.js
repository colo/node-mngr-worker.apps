'use strict'

const debug = require('debug')('Server:Apps:Educativa:Checks:filter:vhosts'),
      debug_internals = require('debug')('Server:Apps:Educativa:Checks:filter:vhosts:Internals');

let async = require('async')
const request = require('request')

module.exports = function(host, urls, cb){//sanitize + metadata
  // cb({host, vhosts})

  let docs = []

  async.eachLimit(urls, 3, function(url, callback){//current nginx limit 5r/s

    request.head({uri: url, timeout: 10000}, function(error, response, body){
      if(response && response.statusCode)
        debug('request result %s %s %O ', host, url, response.statusCode)

      // pipeline.get_input_by_id('input.vhosts').fireEvent('onSuspend')
      // if(error){
      //   debug('request result %O', error)
      //   process.exit(1)
      // }
      let doc = {
        id: undefined,
        data: {},
        metadata: {
          path: 'educativa.checks.vhosts',
          type: 'check',
          host: host,
          tag: ['check', 'vhost','enabled', 'nginx', 'port', 'uri', 'url', 'schema', 'protocol'],
          timestamp: Date.now()
        }
      }

      let id = url.replace('://', '.').replace(':', '.')
      doc.id = doc.metadata.host+'.'+doc.metadata.path+'.'+id+'@'+doc.metadata.timestamp
      doc.metadata.id = doc.id

      if(response){
        doc.data = {
          headers: response.headers,
          code: response.statusCode,
          message: response.statusMessage,
          host: response.request.uri.host,
          hostname: response.request.uri.host,
          port: response.request.uri.port,
          protocol: response.request.uri.protocol,
        }

        doc.metadata.tag.push(response.statusCode)


        // debug('request result %O %O %s',
        //   response.headers,
        //   response.statusCode,
        //   response.request.uri.host,
        //   response.request.uri.hostname,
        //   response.request.uri.port,
        //   response.request.uri.protocol,
        //   host
        // )
        // process.exit(1)
      }
      else{
        Object.each(error, function(value, key){
          error[key] = value.toString()
        })
        doc.data = error
        doc.data.uri = url
        if(error.code) doc.metadata.tag.push(error.code)
        error.code = (error.code) ? error.code : (error.reason) ? error.reason : 'unknown'
        doc.metadata.tag.push('error')
      }

      docs.push(doc)
      callback()
    })
  }, function(err) {

      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        debug('request ERROR %o', err)
      } else {
        // debug('request SAVE %O', docs)

        //resume if every host has been checked
        // if(Object.every(hosts_checks, function(value, host){ return value })){
        //   pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
        // }
        // debug('2nd filter groups %O', docs)
        // process.exit(1)

        // pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')

        // next(docs, opts, next, pipeline)
        cb(docs)
        setTimeout(function(){
          process.exit(0)
        }, 2000)

        // console.log('All files have been processed successfully');
      }
  });


}
