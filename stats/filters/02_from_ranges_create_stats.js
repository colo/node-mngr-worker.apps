'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os|^munin|^logs/
// let paths_whitelist = /^os$/
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


const traverse_path_require = require('node-tabular-data').traverse_path_require
const hooks_path = path.join(process.cwd(), '/apps/stats/hooks/')

const DEFAULT_GROUP_INDEX = 'metadata.host'

module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table
  full_range = full_range || false
  let group_index = (opts && opts.group_index !== undefined) ? opts.group_index : DEFAULT_GROUP_INDEX
  // let {input, output, type } = payload
  // let table = input.table

  // const stat = require('../libs/stat')[type]

  let filter = function(doc, opts, next, pipeline){
    // debug('3rd filter %o', doc)
    // process.exit(1)

    if(doc && doc.id === 'range' && doc.metadata && doc.metadata.from === table && doc.data){
      debug('process filter %o', doc)
      // process.exit(1)
      let values = {};
      let first, last
      // let tag = []
      let metadata = {}
      let hooks = {}

      // if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){


      last = doc.data[0].metadata.timestamp;

      first = doc.data[doc.data.length - 1].metadata.timestamp;


      Array.each(doc.data, function(group, arr_index){
        let path = group.metadata.path
        // let _metadata = {}

        // if(group.metadata.domain == 'XXXX'){
        //   debug('GROUP', group.metadata) //, values['XXXX']['logs.educativa']['hits'] group.metadata.timestamp, group.data.hits
        // //   process.exit(1)
        // }

        // debug_internals('PATH', path)

        if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

          // let data = doc.data
          let timestamp = group.metadata.timestamp;
          // let host = group.metadata.host
          let grouped = group[group_index.split('.')[0]][group_index.split('.')[1]]
          // tag.combine(group.metadata.tag)
          // metadata = Object.merge(metadata, group.metadata)
          // debug_internals('GROUPED %s', grouped)
          // process.exit(1)
          if(!metadata[grouped]) metadata[grouped] = {};
          if(!metadata[grouped][path]) metadata[grouped][path] = {};

          Object.each(group.metadata, function(val, metadata_prop){
            if(
              metadata_prop !== 'timestamp'
              && metadata_prop !== '_timestamp'
              && metadata_prop !== 'type'
              && metadata_prop !== 'path'
              // && metadata_prop !== 'tag'
              && metadata_prop !== group_index.split('.')[1]
            ){
              if(!metadata[grouped][path][metadata_prop]) metadata[grouped][path][metadata_prop] = []

              if(!Array.isArray(val))
                val = [val]

              metadata[grouped][path][metadata_prop].combine(val)
            }
          })

          // debug_internals('INDEX', DEFAULT_GROUP_INDEX, group_index, grouped, metadata[grouped])
          // process.exit(1)

          if(!values[grouped]) values[grouped] = {};
          if(!values[grouped][path]) values[grouped][path] = {};

          // try{
          let _require = traverse_path_require(type, hooks_path, path)
            // try{
            //   //debug_internals('HOOK path %s', path)
            //   let _require = require('../hooks/'+type+'/'+path)
          if(_require)
            hooks[path] = _require
            // //debug_internals('HOOK path %s', path)
            // let _require = require('../hooks/'+type+'/'+path)
            // if(_require)
            //   hooks[path] = _require
          // }
          // catch(e){
          //   debug_internals('no hook file for %s %o', path, e)
          //   process.exit(1)
          // }
          // if(path === 'os.procs'){
            // debug_internals('HOOKs', hooks)
            // process.exit(1)
          // }
          Object.each(hooks, function(hook, hook_path){
            if(hook_path === path && typeof hook.pre_values == 'function'){
              values[grouped][path] = hook.pre_values(values[grouped][path], group)
            }
          })

          Object.each(group.data, function(value, key){//item real data

            let _key = key
            // debug('KEY %s %o %d', key, value, Object.getLength(group.data))
            // process.exit(1)

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

            // if(arr_index == 0){
              // process.exit(1)

              // values[grouped][path] = hooks[path].post_values(values[grouped][path])
            // }

            // if(path == 'os.cpus'){
            //   debug_internals('KEY %s %s', key, _key, grouped, hooks)
            //   process.exit(1)
            // }

            if(!values[grouped][path][key]){

              if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].key == 'function'){
                values[grouped][path] = hooks[path][_key].key(values[grouped][path], timestamp, value, key, group.metadata)

                if(values[grouped][path][key] === undefined)
                  delete values[grouped][path][key]
              }
              else{
                values[grouped][path][key] = {};
              }
            }


            if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'){
              values[grouped][path] = hooks[path][_key].value(values[grouped][path], timestamp, value, key, group.metadata)

            }
            else if(values[grouped][path][key]){
              // if(type === 'minute' || value['mean'] === undefined){
              //   values[grouped][path][key][timestamp] = value;
              // }
              // else{
              //   /**
              //   * from historical
              //   * */
              //   values[grouped][path][key][timestamp] = value['mean']
              // }

              // values[grouped][path][key][timestamp] = value
              if(!values[grouped][path][key][timestamp]){
                values[grouped][path][key][timestamp] = value
              }
              else if(Array.isArray(values[grouped][path][key][timestamp])){
                values[grouped][path][key][timestamp].push(value)
              }
              else{
                let _tmp = values[grouped][path][key][timestamp]
                values[grouped][path][key][timestamp] = [_tmp]
                values[grouped][path][key][timestamp].push(value)
              }

              // if(!values[grouped][path][key][timestamp]) values[grouped][path][key][timestamp] = []
              // values[grouped][path][key][timestamp].push(value)




            }


          });

          // if(path === 'os.cpus'){
          //   debug_internals('HOOK DOC KEY %s %o ', path, hooks, arr_index, doc.data.length)
          //   process.exit(1)
          // }

          // if(arr_index == doc.data.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
          // if(arr_index == doc.data.length -1){
          //   Object.each(hooks, function(hook, hook_path){
          //     if(hook_path === path && typeof hook.post_values == 'function'){
          //       values[grouped][path] = hook.post_values(values[grouped][path], group.metadata)
          //     }
          //   })
          // }
        }//__white_black_lists_filter




      })

      Object.each(values, function(group, grouped){
        Object.each(group, function(data, path){
          Object.each(hooks, function(hook, hook_path){
            if(hook_path === path && typeof hook.post_values == 'function'){
              values[grouped][path] = hook.post_values(values[grouped][path], group.metadata)
            }
          })
        })
      })






//
//
      // if(values.XXXX){
      //   debug_internals('values %o', values.XXXX['logs.nginx'])
      //   process.exit(1)
      // }

      debug_internals('values %s', JSON.stringify(values))
      // process.exit(1)

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

              // debug_internals('HOOK DOC KEY %s %s %s', path, key, _key, value)
              // if(_key === "geoip")
              // process.exit(1)

              if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].doc == 'function'){
                new_doc.data = hooks[path][_key].doc(new_doc.data, value, key)

                // if(path == 'os.mounts')
                //   debug_internals('value %s %o', key, new_doc.data)
              }
              else{
                let arr = []
                Object.each(value, function(row, timestamp){
                  // debug_internals('HOOK DOC KEY %s %o %o', row,timestamp)
                  if(Array.isArray(row)){
                    arr.combine(row)
                  }
                  else{
                    arr.push(row)
                  }
                  // debug_internals('HOOK DOC KEY %s %o %o', arr)
                  // process.exit(1)
                })
                new_doc['data'][key] = stat(arr)
                // new_doc['data'][key] = stat(value)
                // debug_internals('HOOK DOC KEY %s %o %o', key, value, new_doc['data'][key])
                // process.exit(1)

              }

              /**
              * add other metadata fields like "domain" for logs
              */

              if(metadata[grouped][path].tag)
                metadata[grouped][path].tag.combine([group_prop])

              new_doc['metadata'] = Object.merge(metadata[grouped][path], {
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


            });

            delete new_doc['metadata'].id

            // new_doc['metadata'].timestamp = new_doc.metadata.range.start
            //
            // if(type === 'day'){
            //   new_doc['metadata'].timestamp = roundHours(new_doc['metadata'].timestamp + HOUR)
            // }
            // else if(type === 'hour'){
            //   new_doc['metadata'].timestamp = roundMinutes(new_doc['metadata'].timestamp + MINUTE)
            // }
            // else{
            //   new_doc['metadata'].timestamp = roundSeconds(new_doc['metadata'].timestamp + SECOND)
            // }
            // let round
            let metadata_id_end
            if(type === 'second'){
              new_doc.metadata.range.start = roundMilliseconds(new_doc.metadata.range.start)
              metadata_id_end = roundMilliseconds(new_doc.metadata.range.start + SECOND)
            }
            else if(type === 'minute'){
              new_doc.metadata.range.start = roundSeconds(new_doc.metadata.range.start)
              metadata_id_end = roundSeconds(new_doc.metadata.range.start + MINUTE)
            }
            else if(type === 'hour'){
              new_doc.metadata.range.start = roundMinutes(new_doc.metadata.range.start)
              metadata_id_end = roundMinutes(new_doc.metadata.range.start + HOUR)
            }
            else if(type === 'day'){
              new_doc.metadata.range.start = roundHours(new_doc.metadata.range.start)
              metadata_id_end = roundHours(new_doc.metadata.range.start + DAY)
            }

            new_doc['metadata'].timestamp = new_doc.metadata.range.start

            new_doc.id = new_doc.metadata[group_prop]+
              // '.historical.minute.'+
              '.'+type+'.'+
              new_doc.metadata.path+'@'+
              new_doc.metadata.range.start+'-'+
              metadata_id_end
              // +'@'+Date.now()

            // if(/^logs/.test(new_doc.metadata.path)){
            debug('NEW DOC %o', JSON.stringify(new_doc))
            process.exit(1)
            // }

            new_doc['metadata'].id = new_doc.id

            sanitize_filter(
              new_doc,
              opts,
              pipeline.output.bind(pipeline),
              pipeline
            )

          })
        });

      }//if(Object.getLength(values) > 0)
    }
  }

  return filter
}
