'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os.procs'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:os.procs:Internals');

let no_stats_chart = {
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

let stats_chart = {
  match: /stats/,

  watch: {

    value: undefined,

    transform: function(values, caller, chart, cb){
      debug_internals('transform', values)
      let transformed = []
      Array.each(values, function(val, index){

        transformed.push({value: val.data, timestamp: val.metadata.timestamp})
        if(index == values.length -1)
          cb(transformed)
      })

    }
  }
}

let clear_values_from_stats = /cmds_count|pids_count|uids_count/ //remove this keys from final data

// let extract_data_os = require( 'node-mngr-docs' ).extract_data_os

module.exports = function(stats, path){
  // debug_internals(path)
  if(no_stats_chart.match.test(path)){
    debug_internals('no_stats_chart', path)

    return no_stats_chart
  }
  else if(stats_chart.match.test(path)){
    debug_internals('stats_chart', path)

    return stats_chart

    // let paths = {}
    //
    // if(Array.isArray(stats)){
    //   Array.each(stats, function(row){
    //
    //     if(row != null){
    //       let {keys, path, host} = extract_data_os(row)
    //
    //       Object.each(keys, function(data, key){
    //
    //         if(!paths[key])
    //           paths[key] = []
    //
    //         paths[key].push(data)
    //       })
    //     }
    //   })
    // }
    // // else if(doc.metadata.host == this.host){
    // else{
    //   let {keys, path, host} = extract_data_os(stats)
    //
    //   paths = keys
    // }
    //
    // Object.each(paths, function(data, data_name){
    //   if(clear_values_from_stats.test(data_name))
    //     delete paths[data_name]
    // })
    //
    // debug_internals('returning...', path, paths)
    //
    //
    // if(typeof cb == 'function')
    //   cb(path, paths)
    //
    // else
    //   return paths
  }
  else{

    return undefined
  }
}
