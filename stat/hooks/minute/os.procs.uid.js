'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Procs:UID');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Procs:UID:Internals');

let ss = require('simple-statistics')

let value_to_data = require('../../libs/value.data')

module.exports = {
  proc: {
    proc: new RegExp('^(0|[1-9][0-9]*)$'),
    // proc: new RegExp('^[a-zA-Z0-9\:]+$'),
    // proc: new RegExp('^.+$'),
    // key: function(entry_point, timestamp, value, key){
    //   entry_point[key] = undefined
    //   return entry_point
    // },
    value: function(entry_point, timestamp, value, key){
      // debug_internals('os.procs prop %s %o', key, value)

      // Object.each(value, function(proc, pid){

        // let prop = key+':'+value['ppid']+':'+value['cmd'] //pid + ppid + command

        // if(!entry_point[prop]) entry_point[prop] = {}

        let data = {
          'percentage_cpu': value['percentage_cpu'],
          'percentage_mem': value['percentage_mem'],
          'rss': value['rss'],
          'vsz': value['vsz'],
          'count': value['count']
          // 'time':
        }

        entry_point[key][timestamp] = data

      // })
      // debug_internals('os.procs prop %s %o', prop, entry_point[prop])

      return entry_point
    },
    doc: function(entry_point, value, key){
      // Object.each(value, function(val, prop){
        // debug_internals('os.procs value %s %o', key, value)

        if(!entry_point[key]) entry_point[key] = {}

        entry_point[key] = Object.clone(value_to_data(value, false))

      // })
      // debug_internals('os.procs.uid value %s %o', key, entry_point[key])
      // process.exit(1)

      return entry_point
    },

  },
}
