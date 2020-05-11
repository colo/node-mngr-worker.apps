'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_buffer_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_buffer_create_stats:Internals');
let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));

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

const traverse_path_require = require('node-tabular-data').traverse_path_require
const hooks_path = path.join(process.cwd(), '/apps/stats/hooks/')

const stat = require('../libs/stat')

// let traversed_path_require = {}
//
// const __traverse_path_require = function(type, require_path, path, stat, original_path){
//   original_path = original_path || path
//   path = path.replace(/_/g, '.')
//   original_path = original_path.replace(/_/g, '.')
//
//   debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)
//
//   if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] !== undefined){
//     return traversed_path_require[require_path+'/'+type+'/'+path]
//   }
//   else if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] === undefined){
//     if(path.indexOf('.') > -1){
//       let pre_path = path.substring(0, path.lastIndexOf('.'))
//       if(traversed_path_require[require_path+'/'+type+'/'+pre_path] !== undefined){
//         let chart = __traverse_path_require(type, pre_path, stat, original_path)
//         traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
//         return chart
//       }
//     }
//     return undefined
//   }
//   else{
//
//     debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)
//
//     try{
//       let chart = require(require_path+'/'+type+'/'+path)(stat, original_path)
//       traversed_path_require[require_path+'/'+type+'/'+path] = chart
//       return chart
//     }
//     catch(e){
//       debug_internals('__traverse_path_require error %o',  e)
//
//       traversed_path_require[require_path+'/'+type+'/'+path] = undefined
//       if(path.indexOf('.') > -1){
//         let pre_path = path.substring(0, path.lastIndexOf('.'))
//         let chart = __traverse_path_require(type, require_path, pre_path, stat, original_path)
//         traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
//         return chart
//       }
//
//       return undefined
//     }
//
//   }
//
//
//   // let path = path.split('.')
//   // if(!Array.isArray(path))
//   //   path = [path]
//   //
//   // Array.each()
// }

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
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = HOUR * 24
const WEEK = DAY * 7

const DEFAULT_GROUP_INDEX = 'metadata.host'

module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table
  let group_index = (opts && opts.group_index !== undefined) ? opts.group_index : DEFAULT_GROUP_INDEX

  // const stat = require('../libs/stat')[type]

  let filter = function(buffer, opts, next, pipeline){
    debug('2nd filter %o', buffer)
    // process.exit(1)
    let sorted_buffer = {}

    if(buffer && buffer.length > 0){
      Array.each(buffer, function(doc){

        if(doc && doc.id === 'changes' && doc.metadata && doc.metadata.from === table && doc.data){
          Array.each(doc.data, function(real_data){
            // let timestamp = real_data.metadata.timestamp
            // let host = real_data.metadata.host
            let grouped = real_data[group_index.split('.')[0]][group_index.split('.')[1]]
            let path = real_data.metadata.path
            // let tags = real_data.metadata.tag
            if(!sorted_buffer[grouped]) sorted_buffer[grouped] = {}
            if(!sorted_buffer[grouped][path]) sorted_buffer[grouped][path] = []

            sorted_buffer[grouped][path].push(real_data)
          })
        }

      })
    }

    debug('process filter %o', sorted_buffer)
    // process.exit(1)


    Object.each(sorted_buffer, function(grouped_data, grouped){
      Object.each(grouped_data, function(real_data, path){
        let values = {};
        let first, last
        // let tag = []
        let metadata = {}
        let hooks = {}



        // if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
        // debug('real_data %s %o', path, real_data)
        // process.exit(1)

        first = real_data[0].metadata.timestamp;

        last = real_data[real_data.length - 1].metadata.timestamp;
        // Array.each(real_data, function(doc_data, d_index){
        //
        //   debug('DOC DATA', doc_data)
        //   process.exit(1)
        //
        //   last = doc_data[0].metadata.timestamp;
        //
        //   first = doc_data[doc_data.length - 1].metadata.timestamp;

          // Array.each(doc_data, function(group, group_index){
          Array.each(real_data, function(group, arr_index){
            debug('GROUP', group)
            // process.exit(1)

            let path = group.metadata.path


            debug_internals('PATH', path)

            if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

              // let data = real_data
              let timestamp = group.metadata.timestamp;
              // let host = group.metadata.host
              let grouped = group[group_index.split('.')[0]][group_index.split('.')[1]]
              // tag.combine(group.metadata.tag)
              // metadata = Object.merge(metadata, group.metadata)
              Object.each(group.metadata, function(val, metadata_prop){
                if(
                  metadata_prop !== 'timestamp'
                  || metadata_prop !== 'type'
                  || metadata_prop !== 'path'
                  || metadata_prop !== group_index.split('.')[1]
                ){
                  if(!metadata[metadata_prop]) metadata[metadata_prop] = []

                  if(!Array.isArray(val))
                    val = [val]

                  metadata[metadata_prop].combine(val)
                }
              })

              if(!values[grouped]) values[grouped] = {};
              if(!values[grouped][path]) values[grouped][path] = {};

              let _require = traverse_path_require(type, hooks_path, path)
              // try{
              //   //debug_internals('HOOK path %s', path)
              //   let _require = require('../hooks/'+type+'/'+path)
              if(_require)
                hooks[path] = _require
              // }
              // catch(e){
              //   debug_internals('no hook file for %s %o', path, e)
              // }
              // if(path === 'os.cpus'){
              debug_internals('HOOKs', path, _require)
                // process.exit(1)
              // }


              Object.each(group.data, function(value, key){//item real data

                let _key = key
                debug('KEY', key)


                if(hooks[path]){
                  Object.each(hooks[path], function(hook_data, hook_key){
                    // if(path == 'os.blockdevices')
                    //   //debug_internals('KEY %s %s', key, hook_key)

                    if(hook_data[hook_key] && hook_data[hook_key] instanceof RegExp){
                      // //debug_internals('KEY %s %s %o', key, hook_key, hook_data[hook_key])

                      if(hook_data[hook_key].test(_key))//if regexp match
                        _key = hook_key
                    }
                    // else{
                    //
                    // }
                  })

                }


                // if(path == 'os.procs')
                //   debug_internals('KEY %s %s', key, _key)

                if(!values[grouped][path][key]){

                  if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].key == 'function'){
                    values[grouped][path] = hooks[path][_key].key(values[grouped][path], timestamp, value, key)

                    if(values[grouped][path][key] == undefined)
                      delete values[grouped][path][key]
                  }
                  else{
                    values[grouped][path][key] = {};
                  }
                }




                if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'){
                  values[grouped][path] = hooks[path][_key].value(values[grouped][path], timestamp, value, key)

                }
                else{
                  // debug('VALUE', type, path, _key, (hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'), value)

                  // if(type === 'minute' || value['mean'] === undefined){
                  // // if(type === 'minute'){
                  //   values[grouped][path][key][timestamp] = value;
                  // }
                  // else{
                  //   /**
                  //   * from historical
                  //   * */
                  //   values[grouped][path][key][timestamp] = value['mean']
                  // }
                  values[grouped][path][key][timestamp] = value



                }


              });

              // debug('VALUES %o', values)

              // if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
              //   values[grouped][path] = hooks[path].post_values(values[grouped][path])
              // }
              if(arr_index == real_data.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                values[grouped][path] = hooks[path].post_values(values[grouped][path])

                // if(/^os\.blockdevices/.test(path)){
                //   debug_internals('os.blockdevices ', values[grouped][path])
                //   process.exit(1)
                // }
              }


            }//__white_black_lists_filter




          })

        // })





  //
  //
        // if(values.colo){
        //   debug_internals('values %o', values.colo)
        //   // process.exit(1)
        // }
        let group_prop = group_index.split('.')[1]

        if(Object.getLength(values) > 0){
          Object.each(values, function(grouped_data, grouped){



            Object.each(grouped_data, function(data, path){

              let new_doc = {data: {}, metadata: {tag: [], range: {start: null, end: null}}};

              Object.each(data, function(value, key){
                let _key = key
                if(hooks[path]){
                  Object.each(hooks[path], function(data, hook_key){
                    if(data[hook_key] && data[hook_key] instanceof RegExp){
                      if(data[hook_key].test(key))//if regexp match

                        _key = hook_key
                    }
                    // else{
                    //
                    // }
                  })

                }

                // debug_internals('HOOK DOC KEY %s %s', key, _key)
                // process.exit(1)

                if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].doc == 'function'){
                  new_doc.data = hooks[path][_key].doc(new_doc.data, value, key)

                }
                else{
                  new_doc['data'][key] = stat(value)
                }

                debug_internals('HOOK DOC KEY %s %o', key, new_doc['data'][key])
                // process.exit(1)




              });

              /**
              * add other metadata fields like "domain" for logs
              */
              if(metadata.tag)
                metadata.tag.combine([group_prop])

              new_doc['metadata'] = Object.merge(metadata, {
                type: type,
                path: path,
                range: {
                  start: first,
                  end: last
                }
              })

              // new_doc['metadata'] = {
              //   tag: tag,
              //   type: type,
              //   host: "*",//filter.sanitize.rethinkdb tries to add a host if it doens't find one
              //   // host: host,
              //   // path: 'historical.'+path,
              //   path: path,
              //   range: {
              //     start: first,
              //     end: last
              //   }
              // }

              new_doc['metadata'][group_prop] = grouped

              delete new_doc['metadata'].id

              let round
              if(type === 'second'){
                round = roundMilliseconds
              }
              else if(type === 'minute'){
                round = roundSeconds
              }
              else if(type === 'hour'){
                round = roundMinutes
              }
              else if(type === 'day'){
                round = roundHours
              }

              new_doc['metadata'].timestamp = round(new_doc.metadata.range.end)

              // new_doc.id = new_doc.metadata.host+
              new_doc.id = new_doc.metadata[group_prop]+
                // '.historical.minute.'+
                '.'+type+'.'+
                new_doc.metadata.path+'@'+
                new_doc.metadata.range.start+'-'+
                new_doc.metadata.range.end
                // +'@'+Date.now()

              // if(path !== 'os.procs'){
              // debug('NEW DOC %o', new_doc)
              // process.exit(1)
              // }
              new_doc['metadata'].id = new_doc.id

              sanitize_filter(
                new_doc,
                opts,
                pipeline.output.bind(pipeline),
                pipeline
              )

            })//host_data
          });

        }//if(Object.getLength(values) > 0)
      })
    })



  }

  return filter
}
