'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os.procs.stats'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os.procs.stats:Internals');

let clear_values = /(cmds_count|pids_count|uids_count)$/ //remove this keys from final data
let chart = {
  match: /stats$/,

  watch: {

    value: undefined,

    transform: function(values, caller, chart, cb){

      let transformed = []
      Array.each(values, function(val, index){
        Object.each(val.data, function(data, data_name){
          if(clear_values.test(data_name))
            delete val.data[data_name]
        })

        debug_internals('transform', {value: val.data, timestamp: val.metadata.timestamp})

        transformed.push({value: val.data, timestamp: val.metadata.timestamp})
        if(index == values.length -1)
          cb(transformed)
      })

    }
  }
}

module.exports = function(stat, path){

  if(!chart.match || chart.match.test(path)){
    return chart
  }
  else{
    return undefined
  }
}
