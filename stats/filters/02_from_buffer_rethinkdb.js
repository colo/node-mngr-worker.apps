'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));

// // paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
// let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
// // let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
// let paths_whitelist = /^os|^munin|^logs/
// // let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^munin/
//
// let __white_black_lists_filter = function(whitelist, blacklist, str){
//   let filtered = false
//   if(!blacklist && !whitelist){
//     filtered = true
//   }
//   else if(blacklist && !blacklist.test(str)){
//     filtered = true
//   }
//   else if(blacklist && blacklist.test(str) && (whitelist && whitelist.test(str))){
//     filtered = true
//   }
//   else if(!blacklist && (whitelist && whitelist.test(str))){
//     filtered = true
//   }
//
//   return filtered
// }


// const stat = require('../libs/stat')
const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const roundSeconds = function(timestamp){
  timestamp = roundMilliseconds(timestamp)
  let d = new Date(timestamp)
  d.setSeconds(0)

  return d.getTime()
}

const roundMinutes = function(timestamp){
  timestamp = roundSeconds(timestamp)
  let d = new Date(timestamp)
  d.setMinutes(0)

  return d.getTime()
}
const roundHours = function(timestamp){
  timestamp = roundMinutes(timestamp)
  let d = new Date(timestamp)
  d.setHours(0)

  return d.getTime()
}

const template_doc = {
  id: undefined,
  data: {},
  metadata: {
    tag: ['rethinkdb'],
    type: 'periodical',
    host: undefined,
    timestamp: undefined,
    path: 'os.rethinkdb.server',
    id: 'os.rethinkdb.server'
  }
}
module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table
  let host = input.host
  let server_id = input.id || undefined

  // const stat = require('../libs/stat')[type]

  let filter = function(buffer, opts, next, pipeline){
    debug('3rd filter %o %o', buffer)
    // process.exit(1)

    if((buffer.id === 'changes' || buffer.id === 'periodical') && buffer.data && buffer.data.length > 0){
      // if(buffer.id === 'periodical')
      //   buffer.data = buffer.data[0]

      Array.each(buffer.data, function(doc, _index){
        // debug('3rd filter DOC %o', doc)
        // process.exit(1)

        if(doc.query_engine !== undefined){
          let ts = roundMilliseconds(Date.now())
          // const ts = buffer.metadata.timestamp + _index
          let new_doc = Object.clone(template_doc)

          new_doc.metadata.tag.push(doc.server)
          new_doc.metadata.tag = new_doc.metadata.tag.combine(doc.id)
          new_doc.metadata.host = host
          new_doc.metadata.timestamp = ts
          new_doc.metadata.id = host +'.'+new_doc.metadata.id + '.' + _index
          
          let clients_doc = Object.clone(new_doc)

          clients_doc.metadata.tag.push('clients')
          if(server_id !== undefined)
            clients_doc.metadata.path += '.'+server_id

          clients_doc.metadata.path += '.clients'
          clients_doc.metadata.id +='.clients@'+ts
          clients_doc.data = {
            connections: doc.query_engine.client_connections,
            active: doc.query_engine.clients_active
          }
          clients_doc.id = clients_doc.metadata.id
          // debug('3rd filter DOC %o', doc)
          // process.exit(1)

          sanitize_filter(
            clients_doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )

          let queries_doc = Object.clone(new_doc)

          queries_doc.metadata.tag.push('queries')
          if(server_id !== undefined)
            queries_doc.metadata.path += '.'+server_id

          queries_doc.metadata.path += '.queries'
          queries_doc.metadata.id +='.queries@'+ts
          queries_doc.data = {
            per_sec: doc.query_engine.queries_per_sec,
            total: doc.query_engine.queries_total
          }
          queries_doc.id = queries_doc.metadata.id
          sanitize_filter(
            queries_doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )

          let read_doc = Object.clone(new_doc)

          read_doc.metadata.tag.push('read_docs')
          if(server_id !== undefined)
            read_doc.metadata.path += '.'+server_id

          read_doc.metadata.path += '.read_docs'
          read_doc.metadata.id +='.read_docs@'+ts
          read_doc.data = {
            per_sec: doc.query_engine.read_docs_per_sec,
            total: doc.query_engine.read_docs_total
          }
          read_doc.id = read_doc.metadata.id
          sanitize_filter(
            read_doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )

          let write_doc = Object.clone(new_doc)

          write_doc.metadata.tag.push('written_docs')
          if(server_id !== undefined)
            write_doc.metadata.path += '.'+server_id

          write_doc.metadata.path += '.written_docs'
          write_doc.metadata.id +='.written_docs@'+ts
          write_doc.data = {
            per_sec: doc.query_engine.written_docs_per_sec,
            total: doc.query_engine.written_docs_total
          }
          write_doc.id = write_doc.metadata.id
          sanitize_filter(
            write_doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )
        }





      })
    }

  }

  return filter
}
