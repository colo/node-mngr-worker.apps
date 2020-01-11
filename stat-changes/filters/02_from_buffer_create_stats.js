'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
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


const stat = require('../libs/stat')

let traversed_path_require = {}

const __traverse_path_require = function(type, require_path, path, stat, original_path){
  original_path = original_path || path
  path = path.replace(/_/g, '.')
  original_path = original_path.replace(/_/g, '.')

  debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)

  if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] !== undefined){
    return traversed_path_require[require_path+'/'+type+'/'+path]
  }
  else if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] === undefined){
    if(path.indexOf('.') > -1){
      let pre_path = path.substring(0, path.lastIndexOf('.'))
      if(traversed_path_require[require_path+'/'+type+'/'+pre_path] !== undefined){
        let chart = __traverse_path_require(type, pre_path, stat, original_path)
        traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
        return chart
      }
    }
    return undefined
  }
  else{

    debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)

    try{
      let chart = require(require_path+'/'+type+'/'+path)(stat, original_path)
      traversed_path_require[require_path+'/'+type+'/'+path] = chart
      return chart
    }
    catch(e){
      debug_internals('__traverse_path_require error %o',  e)

      traversed_path_require[require_path+'/'+type+'/'+path] = undefined
      if(path.indexOf('.') > -1){
        let pre_path = path.substring(0, path.lastIndexOf('.'))
        let chart = __traverse_path_require(type, require_path, pre_path, stat, original_path)
        traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
        return chart
      }

      return undefined
    }

  }


  // let path = path.split('.')
  // if(!Array.isArray(path))
  //   path = [path]
  //
  // Array.each()
}

module.exports = function(payload){
  let {input, output, type } = payload
  let table = input.table

  // const stat = require('../libs/stat')[type]

  let filter = function(buffer, opts, next, pipeline){
    // debug('3rd filter %o', buffer)
    // process.exit(1)
    let sorted_buffer = {}

    if(buffer && buffer.length > 0){
      Array.each(buffer, function(doc){

        if(doc && doc.id === 'changes' && doc.metadata && doc.metadata.from === table && doc.data){
          Array.each(doc.data, function(real_data){
            // let timestamp = real_data.metadata.timestamp
            let host = real_data.metadata.host
            let path = real_data.metadata.path
            // let tags = real_data.metadata.tag
            if(!sorted_buffer[host]) sorted_buffer[host] = {}
            if(!sorted_buffer[host][path]) sorted_buffer[host][path] = []

            sorted_buffer[host][path].push(real_data)
          })
        }

      })
    }

    // debug('process filter %o', sorted_buffer)
    // process.exit(1)


    Object.each(sorted_buffer, function(host_data, host){
      Object.each(host_data, function(real_data, path){
        let values = {};
        let first, last
        let tag = []
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
          Array.each(real_data, function(group, group_index){
            debug('GROUP', group)
            // process.exit(1)

            let path = group.metadata.path


            debug_internals('PATH', path)

            if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

              // let data = real_data
              let timestamp = group.metadata.timestamp;
              let host = group.metadata.host
              tag.combine(group.metadata.tag)
              metadata = Object.merge(metadata, group.metadata)

              if(!values[host]) values[host] = {};
              if(!values[host][path]) values[host][path] = {};

              let _require = __traverse_path_require(type, '../hooks/', path)
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

                if(!values[host][path][key]){

                  if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].key == 'function'){
                    values[host][path] = hooks[path][_key].key(values[host][path], timestamp, value, key)

                    if(values[host][path][key] == undefined)
                      delete values[host][path][key]
                  }
                  else{
                    values[host][path][key] = {};
                  }
                }




                if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'){
                  values[host][path] = hooks[path][_key].value(values[host][path], timestamp, value, key)

                }
                else{
                  if(type === 'minute' || !value['mean']){
                    values[host][path][key][timestamp] = value;
                  }
                  else{
                    /**
                    * from historical
                    * */
                    values[host][path][key][timestamp] = value['mean']
                  }




                }


              });

              // if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
              //   values[host][path] = hooks[path].post_values(values[host][path])
              // }
              if(group_index == real_data.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                values[host][path] = hooks[path].post_values(values[host][path])

                // if(/^os\.blockdevices/.test(path)){
                //   debug_internals('os.blockdevices ', values[host][path])
                //   process.exit(1)
                // }
              }


            }//__white_black_lists_filter




          })

        // })





  //
  //
        // if(values.colo && values.colo['os.cpus']){
        //   debug_internals('values %o', values.colo['os.cpus'])
        //   process.exit(1)
        // }

        if(Object.getLength(values) > 0){
          Object.each(values, function(host_data, host){



            Object.each(host_data, function(data, path){

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

                debug_internals('HOOK DOC KEY %s %s', key, _key)
                // process.exit(1)

                if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].doc == 'function'){
                  new_doc.data = hooks[path][_key].doc(new_doc.data, value, key)

                }
                else{
                  new_doc['data'][key] = stat(value)
                }





              });

              /**
              * add other metadata fields like "domain" for logs
              */
              new_doc['metadata'] = Object.merge(metadata, {
                tag: tag,
                type: type,
                host: host,
                // path: 'historical.'+path,
                path: path,
                range: {
                  start: first,
                  end: last
                }
              })

              delete new_doc['metadata'].id

              new_doc['metadata'].timestamp = new_doc.metadata.range.end

              new_doc.id = new_doc.metadata.host+
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
