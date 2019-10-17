'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_default_query_get_lasts:Internals');

module.exports = function(payload){
  let {input, output, type } = payload
  let table = input.table

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

        Array.each(path_data.hosts, function(host){

          pipeline.get_input_by_id('input.historical').fireEvent('onOnce', {
            id: "once",
            query: {
              "q": [
                "data",
                // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
                "metadata"
              ],
              "transformation": [
                {
                "orderBy": {"index": "r.desc(timestamp)"}
                },
                {
                  "slice": [0, 1]
                }


              ],
              "filter": ["r.row('metadata')('path').eq('"+path+"')", "r.row('metadata')('host').eq('"+host+"')", "r.row('metadata')('type').eq('"+type+"')"]
            },
            params: {},
          })
        })

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
