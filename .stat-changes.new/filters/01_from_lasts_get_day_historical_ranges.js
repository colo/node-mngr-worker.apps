'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:from_lasts_get_day_historical_ranges');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:from_lasts_get_day_historical_ranges:Internals');
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

module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table
  full_range = full_range || false

  // let {input, output, type, full_range } = payload
  // let table = output.table

  let filter = function(doc, opts, next, pipeline){
    debug('2nd filter %o', doc, doc.id, table, doc.metadata.from)
    // process.exit(1)

    if(doc && doc.id === 'lasts'){ // && doc.metadata && doc.metadata.from === table
      // let { type, input, input_type, app } = opts


      let ranges = []
      let data

      let path = doc.metadata.filter[0].replace("r.row('metadata')('path').eq('", '')
      path = path.substring(0, path.indexOf("'"))

      let host = doc.metadata.filter[1].replace("r.row('metadata')('host').eq('", '')
      host = host.substring(0, host.indexOf("'"))

      let range = []
      let end_range
      // debug('HOST %s', host)

      if(pipeline.current[input.table] && pipeline.current[input.table].data){
        data = pipeline.current[input.table].data

        Object.each(data, function(group){
          if(group.path === path){
            end_range = (!end_range ||  roundHours(group.range[1]  + (DAY - HOUR)) > end_range) ? roundHours(group.range[1] + (DAY - HOUR)) : end_range
          }

        })
      }
      /**
      * if no data (404)
      **/
      if(doc.err && pipeline.current[input.table] && pipeline.current[input.table].data){
        data = pipeline.current[input.table].data

        Object.each(data, function(group){
          if(group.path === path){
            // range[0] = group.range[0]
            range[0] = (group.range[0] > Date.now() - WEEK || full_range === true ) ? group.range[0] : roundHours(Date.now() - WEEK)
            range[1] = roundHours(range[0] + DAY + HOUR)//limit on next day
            // end_range = group.range[1]
          }

        })

      }
      else if(doc.data){
        data = doc.data
        debug('2nd filter %o', data)
        Array.each(data, function(group){
          // Array.each(group, function(group_item){
            range[0] = (!range[0] || group.metadata.range.end < range[0]) ? group.metadata.range.end : range[0]
            range[1] = roundHours(range[0] + DAY + HOUR)//limit on next day
            // end_range = Date.now()
            // end_range =  pipeline.current[table].data
            end_range = (end_range) ? end_range : Date.now()
          // })
        })
        // process.exit(1)
      }

      debug('range %s %s %s %s', new Date(range[0]), new Date(range[1]), new Date(end_range), host, path)
      // process.exit(1)

      while(range[0] < end_range && range[1] <= roundHours(Date.now())){
      // while(range[0] < end_range && range[1] <= roundHours(Date.now() + DAY)){//test

        // for(let i = 0; i < group.hosts.length; i++){
        //   let host = group.hosts[i]
          // let ranges = []
          ranges.push({
            id: "range",
            Range: "posix "+range[0]+"-"+range[1]+"/*",
            query: {
              index: false,
              "q": [
                "id",
                "data",
                // {"metadata": ["host", "tag", "timestamp", "path"]}
                "metadata"
              ],
              "transformation": [
                {
                "orderBy": {"index": "r.desc(timestamp)"}
                },
                // {
                // 	"slice": [0, 1]
                // }


              ],
              "filter": [
                "r.row('metadata')('path').eq('"+path+"')",
                "r.row('metadata')('host').eq('"+host+"')",
                "r.row('metadata')('type').eq('hour')"
              ]
            },
            params: {},


          })

        // }
        range[0] = range[1]
        range[1] += DAY//limit on next day

      }






      debug('RANGES %O', ranges)
      // process.exit(1)
      // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', [ranges])

      // async.tryEach(ranges)
      async.eachLimit(
        ranges,
        1,
        function(range, callback){
          // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
          // callback()
          let wrapped = async.timeout(function(range){
            // sleep(1001).then( () => {
            //   // process.exit(1)
              debug('RANGE', range)
            // })


            pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
            // process.exit(1)
            // callback()
          }, 100)

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

      // debug('filter os_historical %o', pipeline.current)
      // next(doc, opts, next, pipeline)
    }
    else{
      next(doc, opts, next, pipeline)
    }
  }
  return filter
}
