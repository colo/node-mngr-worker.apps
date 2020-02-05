'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_ranges_create_stats:Internals');
let ss = require('simple-statistics');

const path = require('path')
// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
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

module.exports = function(payload){
  let {input, output, type } = payload
  let table = input.table

  // const stat = require('../libs/stat')[type]

  let filter = function(doc, opts, next, pipeline){
    debug('3rd filter %o', doc)
    // process.exit(1)

    if(doc && doc.id === 'range' && doc.metadata && doc.metadata.from === table && doc.data){
      debug('process filter %o', doc)
      // process.exit(1)
      let values = {};
      let first, last
      let tag = []
      let metadata = {}
      let hooks = {}

      // if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){


      last = doc.data[0].metadata.timestamp;

      first = doc.data[doc.data.length - 1].metadata.timestamp;
      // Array.each(doc.data, function(doc_data, d_index){
      //
      //   debug('DOC DATA', doc_data)
      //   process.exit(1)
      //
      //   last = doc_data[0].metadata.timestamp;
      //
      //   first = doc_data[doc_data.length - 1].metadata.timestamp;

        // Array.each(doc_data, function(group, group_index){
        Array.each(doc.data, function(group, group_index){
          debug('GROUP', group)

          let path = group.metadata.path


          debug_internals('PATH', path)

          if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

            // let data = doc.data
            let timestamp = group.metadata.timestamp;
            let host = group.metadata.host
            tag.combine(group.metadata.tag)
            metadata = Object.merge(metadata, group.metadata)

            if(!values[host]) values[host] = {};
            if(!values[host][path]) values[host][path] = {};

            try{
              //debug_internals('HOOK path %s', path)
              let _require = require('../hooks/'+type+'/'+path)
              if(_require)
                hooks[path] = _require
            }
            catch(e){
              debug_internals('no hook file for %s %o', path, e)
            }
            // if(path === 'os.procs'){
            //   debug_internals('HOOKs', hooks)
            //   process.exit(1)
            // }


            Object.each(group.data, function(value, key){//item real data

              let _key = key
              debug('KEY', key)
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
            if(group_index == doc.data.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
              values[host][path] = hooks[path].post_values(values[host][path])
            }
          }//__white_black_lists_filter




        })

      // })





//
//
      // if(values.colo && values.colo)
      // debug_internals('values %o', values)
      // process.exit(1)

      if(Object.getLength(values) > 0){
        Object.each(values, function(host_data, host){

          let new_doc = {data: {}, metadata: {tag: [], range: {start: null, end: null}}};

          Object.each(host_data, function(data, path){

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

                // if(path == 'os.mounts')
                //   debug_internals('value %s %o', key, new_doc.data)
              }
              else{
                // let data_values = Object.values(value);
                // let min = ss.min(data_values);
                // let max = ss.max(data_values);

                // new_doc['data'][key] = {
                //   // samples : value,
                //   min : min,
                //   max : max,
                //   mean : ss.mean(data_values),
                //   median : ss.median(data_values),
                //   mode : ss.mode(data_values),
                //   range: max - min
                // };
                new_doc['data'][key] = stat(value)
              }

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



            });

            delete new_doc['metadata'].id

            new_doc['metadata'].timestamp = new_doc.metadata.range.end

            if(type === 'hour'){
              new_doc['metadata'].timestamp = roundMinutes(new_doc['metadata'].timestamp + MINUTE)
            }
            else{
              new_doc['metadata'].timestamp = roundSeconds(new_doc['metadata'].timestamp + SECOND)
            }

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

          })
        });

      }//if(Object.getLength(values) > 0)
    }
  }

  return filter
}
