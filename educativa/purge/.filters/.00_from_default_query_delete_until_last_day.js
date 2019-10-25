'use strict'

let debug = require('debug')('Server:Apps:Educativa:Purge:All:Filters:from_default_query_delete_until_last_hour');
let debug_internals = require('debug')('Server:Apps:Educativa:Purge:All:Filters:from_default_query_delete_until_last_hour:Internals');

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

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
// const DAY = HOUR * 24
const DAY = 15 * MINUTE //devel
module.exports = function(payload){
  let {input, output, type } = payload
  let table = input.table

  let filter = function(doc, opts, next, pipeline){
    debug('1st filter %o', doc, table)
    if(doc && doc.id === 'default' && doc.data && doc.metadata && doc.metadata.from === table){
      // let { type, input, input_type, app } = opts

      // let hosts = []
      // let paths = []
      // let range = [0,0]
      // let historical_range = [0,0]

      // if(doc && doc.data && doc.metadata && doc.metadata.from === 'logs'){
      if(!pipeline.current) pipeline.current = {}
      pipeline.current[doc.metadata.from] = doc

      // debug('PIPELINE %o', pipeline)
      let end = roundSeconds(Date.now() - DAY)

      debug('1st filter END RANGE %s', new Date(end))

      Array.each(doc.data, function(group, index){
        // range[0] = (group.range && (group.range[0] < range[0] || range[0] === 0)) ? group.range[0] : range[0]
        // range[1] = (group.range && group.range[1] > range[1] ) ? group.range[1] : range[1]
        // hosts.combine(group.hosts)
        // paths.push(group.path)

        Array.each(group.hosts, function(host){
          pipeline.get_input_by_id('input.checks').fireEvent('onRange', {
            id: "range",
            Range: "posix 0-"+end+"/*",
            query: {
              "q": [
                "id",
                // "data",
                // // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
                // "metadata"
              ],
              "transformation": [
                // {
                // "orderBy": {"index": "r.desc(asc)"}
                // },
                // {
                //   "slice": [0, 1]
                // }


              ],
              "filter": [
                "r.row('metadata')('path').eq('"+group.path+"')",
                "r.row('metadata')('host').eq('"+host+"')",
                "r.row('metadata')('type').eq('"+type+"')"
              ]
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
