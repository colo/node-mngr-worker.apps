'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
// let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    data_formater_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.data_formater'))


// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
let paths_whitelist = /^os|^munin|^logs/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^munin/

let __white_black_lists_filter = function(whitelist, blacklist, str){
  let filtered = false
  if(!blacklist && !whitelist){
    filtered = true
  }
  else if(blacklist && !blacklist.test(str)){
    filtered = true
  }
  else if(blacklist && blacklist.test(str) && (whitelist && whitelist.test(str))){
    filtered = true
  }
  else if(!blacklist && (whitelist && whitelist.test(str))){
    filtered = true
  }

  return filtered
}


const stat = require('../libs/stat')

module.exports = function(payload){
  let {input, output, type, format } = payload
  let table = input.table

  // const stat = require('../libs/stat')[type]

  let filter = function(buffer, opts, next, pipeline){
    // debug('3rd filter %o', buffer, format)
    // process.exit(1)
    // let sorted_buffer = {}

    if(buffer && buffer.length > 0){
      Array.each(buffer, function(buffered_doc){
        debug('3rd filter %o', buffered_doc, format)
        // process.exit(1)
        if(buffered_doc && buffered_doc.id === 'changes' && buffered_doc.metadata && buffered_doc.metadata.from === table && buffered_doc.data){
          Array.each(buffered_doc.data, function(real_data){

            data_formater_filter(real_data, format, process.cwd()+'/apps/stat-changes/libs/', function(data){
              let doc = Object.clone(real_data)
              // debug('result %o', data)
              let key = Object.keys(data)[0]
              doc.data = data[key]
              doc.metadata.format = format
              // next(doc, opts, next, pipeline)
              sanitize_filter(
                doc,
                opts,
                pipeline.output.bind(pipeline),
                pipeline
              )
              // // process.exit(1)
            })
        //     // let timestamp = real_data.metadata.timestamp
        //     let host = real_data.metadata.host
        //     let path = real_data.metadata.path
        //     // let tags = real_data.metadata.tag
        //     if(!sorted_buffer[host]) sorted_buffer[host] = {}
        //     if(!sorted_buffer[host][path]) sorted_buffer[host][path] = []
        //
        //     sorted_buffer[host][path].push(real_data)
          })
        }



      })
    }





  }

  return filter
}
