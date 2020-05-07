'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts:Internals');

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os|^munin|^logs/
// let paths_whitelist = undefined
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

const async = require('async')

module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table

  // let {input, output, type, full_range } = payload
  // let table = input.table
  full_range = full_range || false

  // throw new Error('el default debe traer solo los hosts, luego traer los paths y enviar todo a este plugin')
  // process.exit(1)
  // {
  //
  //
  // 	"q": [
  // 		{"metadata": ["path"]}
  // 	],
  // "aggregation": "distinct",
  // "filter": "r.row('metadata')('host').eq('colo')"
  // }

  let filter = function(doc, opts, next, pipeline){
    debug('1st filter %o', doc, table)
    // process.exit(1)

    if(doc && doc.id === 'periodical' && doc.data && doc.metadata && doc.metadata.from === table){
      // process.exit(1)
      // let { type, input, input_type, app } = opts

      // let hosts = []
      // let paths = []
      // let range = [0,0]
      // let historical_range = [0,0]

      // if(doc && doc.data && doc.metadata && doc.metadata.from === 'logs'){
      if(!pipeline.current) pipeline.current = {}
      pipeline.current[doc.metadata.from] = doc

      // debug('PIPELINE %o', pipeline)
      // let hosts = pipeline.current[doc.metadata.from].hosts //from first filter, attach hosts

      // debug('2nd filter %o', hosts)
      let docs = []

      // Array.each(doc.data, function(path_data){
      Object.each(doc.data, function(path_data, path){
        // let path = path_data.path

      //   // range[0] = (group.range && (group.range[0] < range[0] || range[0] === 0)) ? group.range[0] : range[0]
      //   // range[1] = (group.range && group.range[1] > range[1] ) ? group.range[1] : range[1]
      //   // hosts.combine(group.hosts)
      //   // paths.push(group.path)
        if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
          debug('path %s', path)

          Array.each(path_data.hosts, function(host){

            docs.push({
              // id: 'once',
              id: 'lasts',
              data: [
                {
                  metadata: {
                    host: host,
                    path: path,
                    range: { end: path_data.range[0], start: path_data.range[1] },// use range end to start on next filter
                    // range: { end: path_data.range[1], start: path_data.range[0] },// use range end to start on next filter
                    type: 'minute'
                  }
                }
              ],
              metadata: {
                from: output.table,
                filter: [
                   'r.row(\'metadata\')(\'path\').eq(\''+path+'\')',
                   'r.row(\'metadata\')(\'host\').eq(\''+host+'\')',
                   'r.row(\'metadata\')(\'type\').eq(\''+type+'\')'
                 ],
                timestamp: Date.now()
              }
            })



          })
        }

      })

      debug('DOCS %o', docs)
      // process.exit(1)

      async.eachLimit(
        docs,
        1,
        function(new_doc, callback){
          // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
          // callback()
          let wrapped = async.timeout(function(new_doc){
            next(new_doc, opts, next, pipeline)
          }, 100)

          // try{
          wrapped(new_doc, function(err, data) {
            if(err){
              // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
              callback()
            }
          })
          // }
          // catch(e){
          //   callback()
          // }
        }
      )
      // }
      // else if(doc && doc.metadata && doc.metadata.from === 'logs_historical'){
      //
      // }

      // debug('filter %o %o %o', doc, range, hosts, paths)
      // next({id: 'munin.default', hosts, paths, range}, opts, next, pipeline)
    }
    else{
      next(doc, opts, next, pipeline)
    }

    // throw new Error('fix mngr-ui-admin Range - there are problems with filter/trasnformation/etc params')
    /**
    * get_input_by_id
    {

      "q": [
        "data",
        {"metadata": ["host", "tag", "timestamp"]}
      ],
      "transformation": [
        {
        "orderBy": {"index": "r.desc(timestamp)"}
        },
        {
          "slice": [0, 1]
        }


      ],
      "filter": "r.row('metadata')('path').eq('munin.entropy')"

    }
    *
    **/
    // input_type.fireEvent('onOnce', {
    //   query: {register: true}
    // })
  }

  return filter
}
