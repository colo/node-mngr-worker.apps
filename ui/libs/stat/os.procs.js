'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os:procs'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os:procs:Internals');

let chart = {
  match: /^((?!stats).)*$/,

  watch: {

    value: undefined,

    transform: function(values, caller, chart, cb){
      // debug_internals('transform', values)
      let transformed = []
      Array.each(values, function(val, index){

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
