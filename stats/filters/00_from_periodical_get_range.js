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
  full_range = full_range || false
  let group_index = (opts && opts.group_index !== undefined) ? opts.group_index : DEFAULT_GROUP_INDEX

  let filter = function(doc, opts, next, pipeline){
    debug('1st filter %o', doc, table, group_index)
    // process.exit(1)

    if(doc && doc.id === 'periodical' && doc.data && doc.metadata && doc.metadata.from === table){
      // process.exit(1)
      // // let { type, input, input_type, app } = opts
      //
      // // let hosts = []
      // // let paths = []
      // // let range = [0,0]
      // // let historical_range = [0,0]
      //
      // // if(doc && doc.data && doc.metadata && doc.metadata.from === 'logs'){
      // if(!pipeline.current) pipeline.current = {}
      // pipeline.current[doc.metadata.from] = doc
      //
      // // debug('PIPELINE %o', pipeline)
      // // let hosts = pipeline.current[doc.metadata.from].hosts //from first filter, attach hosts
      //
      // // debug('2nd filter %o', hosts)
      let ranges = []
      // let ranges = {
      //   id: "range",
      //   Range: undefined,
      //   query: []
      // }

      Array.each(doc.data, function(distinct_group){
        Array.each(distinct_group, function(distinct_doc){
          let path = (distinct_doc.metadata && distinct_doc.metadata.path) ? distinct_doc.metadata.path : undefined

          if(path === undefined || __white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
            debug('path %s %o', path, distinct_doc, group_index.split('.')[0], group_index.split('.')[1])
            // process.exit(1)

            let start, end
            let req = { query: { filter: [] } }
            if(doc.metadata.filter){
              if(Array.isArray(doc.metadata.filter)){
                req.query.filter = Array.clone(doc.metadata.filter)
              }
              else{
                req.query.filter.push(doc.metadata.filter)
              }
            }
            let first_level_group = group_index.split('.')[0]
            let second_level_group = group_index.split('.')[1]

            let data = distinct_doc[first_level_group][second_level_group]

            req.query.filter.push(
              "r.row('"+first_level_group+"')('"+second_level_group+"').eq('"+data+"')"
            )

            if(type === 'minute'){
              req.query.filter.push("r.row('metadata')('type').eq('periodical')")
              end = roundSeconds((req.opt && req.opt.range) ? req.opt.range.end : Date.now())
              start  = roundSeconds((req.opt && req.opt.range) ? req.opt.range.start : end - MINUTE)
            }
            else if(type === 'hour'){
              req.query.filter.push("r.row('metadata')('type').eq('minute')")
              end = roundMinutes((req.opt && req.opt.range) ? req.opt.range.end : Date.now())
              start  = roundMinutes((req.opt && req.opt.range) ? req.opt.range.start : end - HOUR)
            }
            else if(type === 'day'){
              req.query.filter.push("r.row('metadata')('type').eq('hour')")
              end = roundHours((req.opt && req.opt.range) ? req.opt.range.end : Date.now())
              start  = roundHours((req.opt && req.opt.range) ? req.opt.range.start : end - DAY)
            }
            else if(type === 'week'){
              req.query.filter.push("r.row('metadata')('type').eq('day')")
              end = roundHours((req.opt && req.opt.range) ? req.opt.range.end : Date.now())
              start  = roundHours((req.opt && req.opt.range) ? req.opt.range.start : end - WEEK)
            }

            // ranges.Range = "posix "+start+"-"+end+"/*"
            // ranges.query.push(Object.merge(
            ranges.push(Object.merge(
                req,
                {
                  id: "range",
                  Range: "posix "+start+"-"+end+"/*",
                  query: {
                    index: false,
                    "q": [
                      "id",
                      "data",
                      "metadata"
                    ],
                    "transformation": [
                      {
                      "orderBy": {"index": "r.desc(timestamp)"}
                      },
                    ],

                  },
                  params: {},


                }
              )
            )



            // })
          }

        })




      })

      debug('RANGES %o', ranges)
      // process.exit(1)

      /**
      * seems to work better , end up with less impact on rethinkdb engine
      **/
      Array.each(ranges, function(range){
        pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
      }.bind(this))

      /**
      * input/rethinkdb takes req.query [] and execute'em sequancially
      **/
      // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', ranges)

      // async.eachLimit(
      //   ranges,
      //   1,
      //   function(range, callback){
      //     // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
      //     // callback()
      //     let wrapped = async.timeout(function(range){
      //       // sleep(1001).then( () => {
      //       //   // process.exit(1)
      //       //   debug('RANGE', range)
      //       // })
      //
      //
      //       pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
      //       // process.exit(1)
      //       // callback()
      //     }, 100)
      //
      //     // try{
      //     wrapped(range, function(err, data) {
      //       if(err){
      //         // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
      //         callback()
      //       }
      //     })
      //     // }
      //     // catch(e){
      //     //   callback()
      //     // }
      //   }
      // )
      // // }
      // // else if(doc && doc.metadata && doc.metadata.from === 'logs_historical'){
      // //
      // // }
      //
      // // debug('filter %o %o %o', doc, range, hosts, paths)
      // // next({id: 'munin.default', hosts, paths, range}, opts, next, pipeline)
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
