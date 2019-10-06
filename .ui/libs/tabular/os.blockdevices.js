'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:tabular:os.blockdevices'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:tabular:os.blockdevices:Internals')


let chart = require('mngr-ui-admin-charts/os/blockdevices_stats')

// module.exports = function(path){
//   debug_internals('net', path)
//
//   if(!chart.match || chart.match.test(path)){
//     return chart
//   }
//   else{
//     return undefined
//   }
// }


let match = /^os\.blockdevices$/

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

let return_charts = function(stats, path){
  debug_internals('return_charts', stats, path)
  let charts = {}

  if(stats && stats !== null)
    Object.each(stats, function(stat, name){
      // debug_internals('return_charts name stat', name, stat)
      charts[name] = __process_stat(Object.clone(chart), name, stat)
      // switch(name){
      //   case 'cpus':
      //     charts['cpus.times'] = __process_stat(os_charts[name].times, 'os.cpus.times', stat)
      //     charts['cpus.percentage'] = __process_stat(os_charts[name].percentage, 'os.cpus.percentage', stat)
      //
      //     break;
      //
      //   default:
      //     if(os_charts[name])
      //       charts[name] = __process_stat(os_charts[name], 'os.'+name, stat)
      //
      // //   // case 'loadavg':
      // //   // case 'uptime':
      // }
    })

  // debug_internals('return_charts', charts)

  return charts
}

module.exports = function(stat, path){
  debug_internals('blockdevices', path)


  if(!match || match.test(path)){
    return return_charts
  }
  else{
    return undefined
  }
}
