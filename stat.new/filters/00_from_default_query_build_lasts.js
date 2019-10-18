'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts:Internals');

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
// let paths_whitelist = /^munin/
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

module.exports = function(payload){
  let {input, output, type, full_range } = payload
  let table = input.table
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

    if(doc && doc.id === 'paths' && doc.data && doc.metadata && doc.metadata.from === table){
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
      Object.each(doc.data, function(path_data, path){
      //   // range[0] = (group.range && (group.range[0] < range[0] || range[0] === 0)) ? group.range[0] : range[0]
      //   // range[1] = (group.range && group.range[1] > range[1] ) ? group.range[1] : range[1]
      //   // hosts.combine(group.hosts)
      //   // paths.push(group.path)
        if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
          Array.each(path_data.hosts, function(host){

            next({
              id: 'once',
              data: [
                {
                  metadata: {
                    host: host,
                    path: path,
                    range: { end: path_data.range[0], start: path_data.range[1] },// use range end to start on next filter
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
            }
            , opts, next, pipeline)


          })
        }

      })
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
