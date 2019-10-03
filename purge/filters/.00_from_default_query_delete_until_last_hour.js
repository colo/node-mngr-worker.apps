'use strict'

let debug = require('debug')('Server:Apps:Purge:Periodical:Filters:from_default_query_delete_until_last_hour');
let debug_internals = require('debug')('Server:Apps:Purge:Periodical:Filters:from_default_query_delete_until_last_hour:Internals');

let async = require('async')

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
// const HOUR = 60 * MINUTE
const HOUR = 15 * MINUTE//devel
const DAY = HOUR * 24
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
      let end = roundSeconds(Date.now() - HOUR)

      debug('1st filter END RANGE %s', new Date(end))

      let ranges = []

      Array.each(doc.data, function(group, index){
        // range[0] = (group.range && (group.range[0] < range[0] || range[0] === 0)) ? group.range[0] : range[0]
        // range[1] = (group.range && group.range[1] > range[1] ) ? group.range[1] : range[1]
        // hosts.combine(group.hosts)
        // paths.push(group.path)

        let range = [0,0]
        // let end_range = 0

        // Array.each(group, function(group_item){
          range[0] = (group.range[0] < range[0] || range[0] === 0) ? group.range[0] : range[0]
          range[1] = roundSeconds(range[0] + 60000)//limit on next minute
          // end_range = Date.now()
          // end_range =  pipeline.current[table].data
          // end_range = (group_item.range[1] > end_range) ? group_item.range[1] : end_range
        // })

        debug('1st filter RANGE %o %o', group, range)

        while(range[0] < end && range[1] <= roundSeconds(Date.now())){

          Array.each(group.hosts, function(host){
            ranges.push({
              id: "range",
              Range: "posix "+range[0]+"-"+end+"/*",
              query: {
                "q": [
                  "id",
                ],
                "transformation": [


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


          // }
          range[0] = range[1]
          range[1] += 60000//limit on next minute

        }

        // Array.each(group.hosts, function(host){
        //   pipeline.get_input_by_id('input.periodical').fireEvent('onRange', {
        //     id: "range",
        //     Range: "posix 0-"+end+"/*",
        //     query: {
        //       "q": [
        //         "id",
        //       ],
        //       "transformation": [
        //
        //
        //       ],
        //       "filter": [
        //         "r.row('metadata')('path').eq('"+group.path+"')",
        //         "r.row('metadata')('host').eq('"+host+"')",
        //         "r.row('metadata')('type').eq('"+type+"')"
        //       ]
        //     },
        //     params: {},
        //   })
        // })

      })

      debug('RANGES %O', ranges)

      async.eachLimit(
        ranges,
        10,
        function(range, callback){
          // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
          // callback()
          let wrapped = async.timeout(function(range){
            // sleep(1001).then( () => {
            //   // process.exit(1)
            //   debug('RANGE', range)
            // })


            pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
            // process.exit(1)
            // callback()
          }, 10)

          // try{
          wrapped(range, function(err, data) {
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
