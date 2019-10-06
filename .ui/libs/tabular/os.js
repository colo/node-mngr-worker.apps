'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:tabular:os'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:tabular:os:Internals');

let os_charts = {
  cpus: {
    times: require('mngr-ui-admin-charts/os/cpus_times'),
    percentage: require('mngr-ui-admin-charts/os/cpus_percentage')
  },
  uptime: require('mngr-ui-admin-charts/os/uptime'),
  loadavg: require('mngr-ui-admin-charts/os/loadavg'),
}


// let chart = {
//   match: /^munin/,
//
//   watch: {
//
//     value: undefined,
//
//     transform: function(values, caller, chart, cb){
//       // debug_internals('transform', values)
//       let transformed = []
//       Array.each(values, function(val, index){
//
//         transformed.push({value: val.data, timestamp: val.metadata.timestamp})
//         if(index == values.length -1)
//           cb(transformed)
//       })
//
//     }
//   }
// }
let match = /^os$/

let __process_stat = function(chart, name, stat){
  // console.log('__process_stat', chart, name, stat)
  if(!Array.isArray(stat))
    stat = [stat]

  if(isNaN(stat[0].value)){
    //sdX.stats.

    let filtered = false
    if(chart.watch && chart.watch.filters){
      Array.each(chart.watch.filters, function(filter){
        let prop_to_filter = Object.keys(filter)[0]
        let value_to_filter = filter[prop_to_filter]

        // //////console.log('stat[0].value[prop_to_filter]', name, stat)
        if(
          stat[0].value[prop_to_filter]
          && value_to_filter.test(stat[0].value[prop_to_filter]) == true
        ){
          filtered = true
        }

      })
    }
    else{
      filtered = true
    }

    if(filtered == true){

      chart = chart.pre_process(chart, name, stat)

      // chart.label = this.__process_chart_label(chart, name, stat) || name
      // let chart_name = this.__process_chart_name(chart, stat) || name

      __process_chart(chart, name, stat)
    }

  }
  else{

    // chart.label = this.__process_chart_label(chart, name, stat) || name
    // let chart_name = this.__process_chart_name(chart, stat) || name
    chart = chart.pre_process(chart, name, stat)

    __process_chart(
      chart,
      name,
      stat
    )
  }

  return chart
}

let __process_chart = function(chart, name, stat){

  if(chart.init && typeOf(chart.init) == 'function')
    chart.init(undefined, chart, name, stat, 'chart')

}

let return_charts = function(stats){
  debug_internals('return_charts', stats)
  let charts = {}

  if(stats && stats !== null)
    Object.each(stats, function(stat, name){
      // debug_internals('return_charts name stat', name, stat)

      switch(name){
        case 'cpus':
          charts['cpus.times'] = __process_stat(os_charts[name].times, 'os.cpus.times', stat)
          charts['cpus.percentage'] = __process_stat(os_charts[name].percentage, 'os.cpus.percentage', stat)

          break;

        default:
          if(os_charts[name])
            charts[name] = __process_stat(os_charts[name], 'os.'+name, stat)

      //   // case 'loadavg':
      //   // case 'uptime':
      }
    })

  // debug_internals('return_charts', charts)

  return charts
}

module.exports = function(stat, path){

  if(!match || match.test(path)){
    return return_charts
  }
  else{
    return undefined
  }
}
