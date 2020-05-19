'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
// let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    data_formater_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.data_formater'))

let paths_blacklist
// let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
// let paths_whitelist = /^os|^munin|^logs/
let paths_whitelist = /^((?!os.procs).)*$/

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

const { fork } = require('child_process');

let forks = {}

module.exports = function(payload){
  let {input, output, opts } = payload
  let format = opts.format
  let type = input.type
  let full_range = input.full_range
  let table = input.table

  // const stat = require('../libs/stat')[type]

  let filter = function(buffer, opts, next, pipeline){
    // debug('3rd filter %o', buffer, format)
    // process.exit(1)
    // let sorted_buffer = {}

    if(buffer && buffer.length > 0){
      Array.each(buffer, function(buffered_doc){
        // debug('3rd filter %o', buffered_doc, format)
        // process.exit(1)
        if(buffered_doc && buffered_doc.id === 'changes' && buffered_doc.metadata && buffered_doc.metadata.from === table && buffered_doc.data){
          Array.each(buffered_doc.data, function(real_data){
            if(__white_black_lists_filter(paths_whitelist, paths_blacklist, real_data.metadata.path)){

              // let doc = Object.clone(real_data)

              if(!forks[real_data.metadata.host]){
                forks[real_data.metadata.host] = fork(process.cwd()+'/apps/stats/libs/fork_filter', [
                  path.join(process.cwd(), '/devel/etc/snippets/filter.data_formater'),
                  // path.join(process.cwd(), '/node_modules/node-tabular-data'),
                  JSON.stringify({
                    require_path : process.cwd()+'/apps/stats/libs/data_formater/'
                  })
                ])

                forks[real_data.metadata.host].on('message', function(msg){
                  let data = msg.result
                  let doc = msg.doc
                  debug('result %o %o', data, doc)
                  // process.exit(1)
                  // let doc = Object.clone(real_data)

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

              }



              forks[real_data.metadata.host].send({
                /**
                * added false as new param data_formater param (data, format, full, cb)
                **/
                params: [real_data, format, false], //process.cwd()+'/apps/stats/libs/data_formater/' -> moved to module param
                doc:  Object.clone(real_data)
              })


              // data_formater_filter(real_data, format, process.cwd()+'/apps/stats/libs/data_formater/', function(data){
              //   debug('result %o', data)
              //   // process.exit(1)
              //   let doc = Object.clone(real_data)
              //
              //   let key = Object.keys(data)[0]
              //   doc.data = data[key]
              //   doc.metadata.format = format
              //   // next(doc, opts, next, pipeline)
              //
              //   sanitize_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              //   // // process.exit(1)
              // })
            }
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
