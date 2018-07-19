var debug = require('debug')('pipeline:os-alerts');
var debug_internals = require('debug')('pipeline:os-alerts:Internals');

// var sanitize_filter = require(path.join(process.cwd(), '/etc/snippets/filter.sanitize.template')),

'use stric'

const path = require('path')

var cron = require('node-cron')

var stats = {}
var tabular_stats = {}

/**
* from os.stats.vue
**/
var extract_data_os_historical = require('node-mngr-docs').extract_data_os_historical

var extract_data_os = require('node-mngr-docs').extract_data_os


/**
* from os.stats.vue
**/

/**
* from os.dashboard.vue
**/

var static_charts = require('./conf/static.tabular')

var DefaultChart = require('./conf/default.tabular')
var _dynamic_charts = require('./conf/dynamic.tabular').rules
var dynamic_blacklist = require('./conf/dynamic.tabular').blacklist
var dynamic_whitelist = require('./conf/dynamic.tabular').whitelist


var initialize_all_charts = function(val){
  Object.each(val, function(stat, key){
    parse_chart_from_stat(stat, key)
  }.bind(this))

  Object.each(static_charts, function(chart, name){
    process_chart(chart, name)
  }.bind(this))
}

/**
* from mixin/chart.vue
**/
var parse_chart_from_stat = function (stat, name){




  if(Array.isArray(stat)){//it's stat

    /**
    * create chart automatically if it's not blacklisted or is whitelisted
    **/
    if(
      (
        ( dynamic_blacklist
        && dynamic_blacklist.test(name) == false )
      || ( dynamic_whitelist
        && dynamic_whitelist.test(name) == true )
      )
      || (!dynamic_blacklist && !dynamic_whitelist)
      && (
        !static_charts
        || Object.keys(static_charts).contains(name) == false
      )
    ){

      // debug_internals('parse_chart_from_stat', name, dynamic_whitelist.test(name))

      dynamic_charts = _get_dynamic_charts(name, _dynamic_charts)

      if(dynamic_charts[name]){

        Array.each(dynamic_charts[name], function(dynamic){

          process_dynamic_chart(Object.clone(dynamic), name, stat)

        }.bind(this))
      }
      else{

        let chart = Object.clone(DefaultChart)

        process_chart(
          chart.pre_process(chart, name, stat),
          name
        )

      }

    }
  }
  else{//blockdevices.[key]
    Object.each(stat, function(data, key){
      parse_chart_from_stat(data, name+'.'+key)
    }.bind(this))

  }


}

var process_dynamic_chart = function (chart, name, stat){

  if(Array.isArray(stat[0].value)){//like 'cpus'

    Array.each(stat[0].value, function(val, index){

      let arr_chart = Object.clone(chart)

      // arr_chart.label = this.process_chart_label(chart, name, stat) || name
      let chart_name = process_chart_name(name, chart, stat) || name

      if(chart.watch.merge != true){
        chart_name += '_'+index
      }

      if(chart.watch.merge != true || index == 0){//merge creates only once instance

        process_chart(
          arr_chart.pre_process(arr_chart, chart_name, stat),
          chart_name
        )

      }

    }.bind(this))

  }
  else if(isNaN(stat[0].value)){
    //sdX.stats.

    let filtered = false
    if(chart.watch && chart.watch.filters){
      Array.each(chart.watch.filters, function(filter){
        let prop_to_filter = Object.keys(filter)[0]
        let value_to_filter = filter[prop_to_filter]

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

      // chart.label = this.process_chart_label(chart, name, stat) || name
      let chart_name = process_chart_name(name, chart, stat) || name

      process_chart(chart, chart_name)
    }

  }
  else{

    // chart.label = this.process_chart_label(chart, name, stat) || name
    let chart_name = process_chart_name(name, chart, stat) || name

    process_chart(
      chart.pre_process(chart, chart_name, stat),
      name
    )
  }

}

var charts = {}
/**
* modifies global obj charts
**/
var process_chart = function (chart, name){

  if(!charts[name]){
    //console.log('process_chart', name)

    if(chart.init && typeOf(chart.init) == 'function')
      chart.init(this, chart, 'chart')

    // this.create_watcher(name, chart)

    charts[name] = chart
  }
}

generic_data_watcher  = require('node-tabular-data').data_to_tabular
flattenObject  = require('node-tabular-data').flattenObject

/**
* ex-update_chart_stat -> update_tabular_stat
**/
var update_tabular_stat = function(name, data, value){
  value = value || tabular_stats

  if(name.indexOf('.') > -1){
    let key = name.substring(0, name.indexOf('.'))
    name = name.substring(name.indexOf('.')+ 1,  name.length)

    if(!value[key])
      value[key] = {}

    update_tabular_stat(name, data, value[key])
  }
  else{
    value[name] = data
  }

}

var _current_nested_array = require('node-tabular-data').nested_array_to_tabular

var _current_number_to_data = require('node-tabular-data').number_to_tabular

var _current_array_to_data = require('node-tabular-data').array_to_tabular

/**
* modified: added name param
**/
process_chart_name = function (name, chart, stat){
  if(chart.name && typeOf(chart.name) == 'function') return chart.name(name, chart, stat)
  else if(chart.name) return chart.name
}
/**
* from mixin/chart.vue
**/


/**
* from mixins/dashboard.vue
**/
_get_dynamic_charts = require('node-tabular-data').get_dynamics

/**
* from mixins/dashboard.vue
**/

// let buffers = []
// let alerts = {
// }

let expanded_alerts = require('./conf/expanded')

let condensed_alerts = require('./conf/condensed')

var alerts_payloads = {}

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
let decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))


module.exports = {
 input: [
  {
    poll: {
      id: "input.os.alerts.cradle",
      conn: [
        {
          scheme: 'cradle',
          host:'elk',
          //host:'127.0.0.1',
          port: 5984 ,
          db: 'dashboard',
          module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/cradle')),
          load: ['apps/os/alerts/current']
        }
      ],
      requests: {
        /**
         * runnign at 20 secs intervals
         * needs 3 runs to start analyzing from last historical (or from begining)
         * it takes 60 secs to complete, so it makes historical each minute
         * @use node-cron to start on 0,20,40....or it would start messuring on a random timestamp
         * */
        // periodical: function(dispatch){
        // 	return cron.schedule('19,39,59 * * * * *', dispatch);//every 20 secs
        // }
        periodical: 1000,
        //periodical: 2000,//test
      },

    },
  },
  {
   poll: {
     id: "input.os.alerts.historical.cradle",
     conn: [
       {
         scheme: 'cradle',
         host:'elk',
         //host:'127.0.0.1',
         port: 5984 ,
         db: 'dashboard',
         module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/cradle')),
         load: ['apps/os/alerts/historical']
       }
     ],
     requests: {
       /**
        * runnign at 20 secs intervals
        * needs 3 runs to start analyzing from last historical (or from begining)
        * it takes 60 secs to complete, so it makes historical each minute
        * @use node-cron to start on 0,20,40....or it would start messuring on a random timestamp
        * */
       periodical: function(dispatch){
       	return cron.schedule('* * * * *', dispatch);//every 20 secs
       }
       // periodical: 20000,
       //periodical: 2000,//test
     },

   },
  },
 ],
 filters: [
    decompress_filter,
     /**
     * code taken from os.stats.vue
     **/
		function(doc, opts, next, pipeline){
      let extracted = {}

      if(doc[0].doc && doc[0].doc.metadata.path.indexOf('historical') < 0 ){
        extracted = Object.clone(extract_data_os(doc))


        if(!pipeline.inputs[1].conn_pollers[0].historical.hosts[extracted.host])
          pipeline.inputs[1].conn_pollers[0].historical.hosts[extracted.host] = 1

        if(!pipeline.inputs[1].conn_pollers[0].historical.paths.contains(extracted.path.replace('/', '.')))
          pipeline.inputs[1].conn_pollers[0].historical.paths.push(extracted.path.replace('/', '.'))

        extracted.path = extracted.path.split('/')

        // process_os_doc(doc, opts, next, pipeline)

        // Object.each(stats, function(host_data, host){
        //   Object.each(host_data, function(path_data, path){
        //     Object.each(path_data, function(data, key){
        //       let name = host+'.'+path+'.'+key
        //       if(
        //         (
        //           ( dynamic_blacklist
        //           && dynamic_blacklist.test(name) == false )
        //         || ( dynamic_whitelist
        //           && dynamic_whitelist.test(name) == true )
        //         )
        //         || (!dynamic_blacklist && !dynamic_whitelist)
        //         && (
        //           !static_charts
        //           || Object.keys(static_charts).contains(name) == false
        //         )
        //       ){
        //         // //console.log('host.path.key', name, charts)
        //         if(charts[name])
        //           generic_data_watcher(data, charts[name], name, update_tabular_stat)
        //
        //         Object.each(charts, function(chart, key){
        //           let chart_host = key.split('.')[0]
        //           if(
        //             chart_host == host
        //             && chart.match &&  chart.match.test(name)
        //             && (chart != charts[name])
        //           ){
        //             // console.log('generic_data_watcher', key, name)
        //             generic_data_watcher(data, chart, key, update_tabular_stat)
        //           }
        //         })
        //       }
        //     })
        //   })
        // })
        // console.log('stats', stats)

        Object.each(charts, function(chart, chart_name){
          // console.log('chart', chart_name)

          let arr_name = chart_name.split('.')
          let find_stats = stats
          let stat_name = undefined
          let found_stat = true
          Array.each(arr_name, function(key, index){

            // console.log('stat_name', stat_name +'.'+ key)
            let find_stats_keys = Object.keys(find_stats)
            let found_key = undefined

            Array.each(find_stats_keys, function(stats_key){
              if(
                !found_key &&
                stats_key == key
                || (chart.match && chart.match.test(stat_name +'.'+ stats_key))
              ){

                /**
                * regexp capture groups are used for things like os.mounts.N,
                * where -> match: /os\.mounts\.(0|[1-9][0-9]*)$/
                * will match all mounts points, and the capture group is used to match each one
                * with corresponding stat index
                **/
                if(chart.match && chart.match.test(stat_name +'.'+ stats_key)){//test for capture group

                  // console.log('capture group', chart.match.exec(stat_name +'.'+ stats_key))

                  let match = chart.match.exec(stat_name +'.'+ stats_key)
                  if(match && match[1] && match[1] == key){//capture group, allow only one
                    found_key = match[1]
                  }
                  else if(!match[1]){
                    found_key = stats_key
                  }
                }
                else{
                  found_key = stats_key
                }

              }
            })

            // console.log('found key',key, stat_name, found_key)

            if(found_key && find_stats[found_key]){
              find_stats = find_stats[found_key]
              if(!stat_name){
                stat_name = found_key
              }
              else{
                stat_name = stat_name +'.'+ found_key
              }
            }
            else{
              found_stat = false
            }

            if(index == arr_name.length -1 && found_stat == true){
              // console.log('found', stat_name, chart_name, find_stats)

              // generic_data_watcher(find_stats, chart, chart_name, update_tabular_stat)
              generic_data_watcher.attempt([find_stats, chart, chart_name, update_tabular_stat], {
                charts: charts,
                // stats: stats,
                host: chart_name.split('.')[0]
              })

            }

          })
        })
        /**
        * passing here to next filter ensures that we do the procesiing no more than onec a sec,
        * after 'os', avoind recalling it on os.historical or other
        */
        if(doc[0].doc.metadata.path == 'os'){
        //
        //   // if(tabular_stats.elk)
        //   // ///console.log('TABULAR STATS', tabular_stats.elk.os.minute)
        //
          next({ data: Object.clone(stats), tabular: Object.clone(tabular_stats)},opts, next, pipeline)
        }
      }
      else if(doc[0].doc && doc[0].doc.metadata){
        extracted = Object.clone(extract_data_os_historical(doc))
        // extracted.path = extracted.path.replace('/', '.')
        extracted.path = extracted.path.split('/')

        /**
        * clean hosts property on each iteration, so we only search on current hosts availables
        **/
        Object.each(pipeline.inputs[1].conn_pollers[0].historical.hosts, function(value, host){
          delete pipeline.inputs[1].conn_pollers[0].historical.hosts[host]
        })

        // process_historical_minute_doc(doc, opts, next, pipeline)
      }

      if(extracted.keys){
        Object.each(extracted.keys, function(data, key){
          if(!stats[extracted.host])
            stats[extracted.host] = {}

          if(Array.isArray(extracted.path)){//ex: os.minute
            let value = stats[extracted.host]

            Array.each(extracted.path, function(sub_path, index){
              if(!value[sub_path])
                value[sub_path] = {}

              // console.log('VALUE', sub_path, value)

              if(index == extracted.path.length - 1){
                // console.log('SET DATA', key, value)
                value[sub_path][key] = data
              }
              else{
                value = value[sub_path]
              }
            })
          }
          else{
            if(!stats[extracted.host][extracted.path])
              stats[extracted.host][extracted.path] = {}

              stats[extracted.host][extracted.path][key] = data
          }


        }.bind(this))

        initialize_all_charts(stats)
      }





    },
    function(doc, opts, next, pipeline){
      //console.log('process_os_doc alerts filter', doc )

      let _alerts = {data: [], tabular: []}

      let parse_condensed_keys = function(condensed, value, alerts){

          let sub_key = condensed.substring(0, condensed.indexOf('.')).trim()
          condensed = condensed.replace(sub_key, '')

          // sub_key = sub_key.replace(/\/|_|-/g, '.')

          let rest_key = condensed.substring(condensed.indexOf('.')+1, condensed.length).trim()
          // rest_key = rest_key.replace('_', '.')

          // Array.each(arr_keys, function(arr_key, index){
          // console.log('sub_key', sub_key, rest_key)

          if(sub_key.length > 0){
            let sub_alert = undefined
            let recurse_alert = undefined

            if(sub_key.indexOf('[') > -1){
              sub_key = sub_key.replace(/\[|\]/g,'')
              // if(!alerts[sub_key])
                sub_alert = []
            }
            else{
              // if(!alerts[sub_key])
                sub_alert = {}
            }

            if(Array.isArray(alerts)){
              let tmp = {}
              tmp[sub_key] = sub_alert
              alerts.push( tmp )//change sub_key to array index
              recurse_alert = alerts[alerts.length - 1][sub_key]
            }
            else{

              if(!alerts[sub_key]){
                alerts[sub_key] = sub_alert
                // let tmp = {}
                // tmp[sub_key] = sub_alert

                // alerts[sub_key] = Object.merge(alerts[sub_key], sub_alert)
              }
              // else{
              //
              // }

              recurse_alert = alerts[sub_key]
            }

            // //console.log('rest_key', sub_key, rest_key, recurse_alert)

            parse_condensed_keys(rest_key, value, recurse_alert)
          }
          else {
            // throw new Error()
            if(Array.isArray(alerts)){
              let tmp = {}
              tmp[rest_key] = value
              alerts.push( tmp )
            }
            else{

              if(value.$payload){
                let new_payload

                if(value.$payload.$extra){

                  if(Array.isArray(value.$payload.$extra)){
                    new_payload = []

                    Array.each(value.$payload.$extra, function(extra, index){
                      let key = Object.keys(extra)[0]
                      new_payload[index] = {}
                      parse_condensed_keys(key, extra[key], new_payload[index])
                    })
                  }
                  else{
                    new_payload = {}
                    let key = Object.keys(value.$payload.$extra)[0]

                    parse_condensed_keys(key, value.$payload.$extra[key], new_payload)


                  }

                  // //console.log('NEW PAYLOAD', new_payload)

                  value.$payload.$extra = new_payload
                }
                else{
                  new_payload = {}
                  let key = Object.keys(value.$payload)[0]
                  new_payload = {}
                  parse_condensed_keys(key, value.$payload[key], new_payload)
                  value.$payload = new_payload
                }

                // //console.log('extras??', rest_key, value.$payload.$extra)

              }

              alerts[rest_key] = value

            }

          }

      }

      Object.each(condensed_alerts, function(alert, condensed){
        parse_condensed_keys(condensed, alert, _alerts)
      })

      let all_alerts = {data: [], tabular: []}
      all_alerts.data = all_alerts.data.append(expanded_alerts.data).append(_alerts.data)
      all_alerts.tabular = all_alerts.tabular.append(expanded_alerts.tabular).append(_alerts.tabular)
      // // Object.merge(expanded_alerts, _alerts)

      // console.log('ALL alerts', all_alerts.tabular[0]['%hosts'].os.loadavg['$payload'])
      // if(doc.tabular && doc.tabular.colo && doc.data.tabular.os && doc.data.tabular.os.procs)
        debug_internals('ALL alerts %O', doc.tabular)

      let original_doc = doc//needed to recurse $payload

      let recurse_alerts = function(alerts, doc, name){
        let result
        if(Array.isArray(alerts)){
          result = []
          Array.each(alerts, function(alert, index){
            result.push ( recurse_alerts(alert, doc, name) )
          })
        }
        else{//assume Object
          // let key = Object.keys(alerts)[0]

          Object.each(alerts, function(alert, key){

            if(key.indexOf('%') == 0){

                if(typeof alert == 'function'){
                  let payload = {
                    property: name,
                    next: next
                  }
                  result = alert.attempt([doc, payload])
                }
                else{
                  result = []
                  Object.each(doc, function(data, doc_key){
                    let sub_name = (name) ? name +'.'+doc_key : doc_key
                    result.push ( recurse_alerts(alert, data, sub_name) )
                  })
                }

            }
            else{

              if(
                doc[key]
                && (
                  typeof alert == 'function'
                  || (alert.$callback && typeof alert.$callback == 'function')
                )
              ){
                // //console.log('ALL alerts', key, alert)

                let fn
                if(alert.$callback){
                  fn = alert.$callback
                }
                else{
                  fn = alert
                }

                let payload = {
                  property: name+'.'+key,
                  next: next
                }

                if(alert.$payload){
                  // let value
                  if(alert.$payload.$extra){

                    if(Array.isArray(alert.$payload.$extra)){
                      alert.$payload.extra = []
                      Array.each(alert.$payload.$extra, function(extra, index){
                        alert.$payload.extra[index] = recurse_alerts(alert.$payload.$extra[index], original_doc, null)
                      })
                    }
                    else{
                      alert.$payload.extra = recurse_alerts(alert.$payload.$extra, original_doc, null)
                    }


                    payload = Object.clone(alert.$payload)
                    payload.property = name+'.'+key
                    // payload.opts = opts
                    payload.next = next
                    // payload.pipeline = pipeline
                    let alert_payload = {}

                    // if(Array.isArra(alert.$payload.$extra)){
                    //   Array.each(alert.$payload.$extra, function(extra, index){
                    //
                    //     if(alerts_payloads[fn.toString()+'.'+payload.property+'.'+index])
                    //       alert_payload = Object.clone(alerts_payloads[fn.toString()+'.'+payload.property+'.'+index])
                    //
                    //     Object.each(alert_payload, function(value, prop){
                    //       if(prop != 'extra' && prop != '$extra' && prop != 'property')
                    //         payload[prop] = value
                    //     })
                    //   })
                    // }
                    // else{

                      if(alerts_payloads[fn.toString()+'.'+payload.property])
                        alert_payload = Object.clone(alerts_payloads[fn.toString()+'.'+payload.property])

                      Object.each(alert_payload, function(value, prop){
                        if(prop != 'extra' && prop != '$extra' && prop != 'property')
                          payload[prop] = value
                      })
                    // }




                  }
                  else{
                    payload['extra'] = recurse_alerts(alert.$payload, original_doc, null)
                  }



                  // value = recurse_alerts(alert.$payload, original_doc, null)
                  // //console.log('alert.$payload', alerts_payloads)
                  // payload['extra'] = value
                }
                // else{
                //   payload.property = name+'.'+key
                // }

                result = fn.attempt([doc[key], payload])

                if(alert.$payload && alert.$payload.$extra){
                  alerts_payloads[fn.toString()+'.'+payload.property] = Object.clone(payload)
                }

              }
              else if (doc[key]) {
                let sub_name = (name) ? name+'.'+key : key
                result = recurse_alerts(alerts[key], doc[key], sub_name)
              }
            }

          })

        }


        return result
      }

      recurse_alerts(all_alerts, doc, null)
      // recurse_alerts(expanded_alerts, doc, null)
      // recurse_alerts(_alerts, doc, null)
    },
    require(path.join(process.cwd(), '/etc/snippets/filter.sanitize.template')),

	],
	output: [
    // function(doc){
    //   //console.log('os alerts output',JSON.decode(doc))
    // },
    //require('./snippets/output.stdout.template'),
    // {
    // 	cradle: {
    // 		id: "output.os.alerts.cradle",
    // 		conn: [
    // 			{
    // 				//host: '127.0.0.1',
    // 				host: 'elk',
    // 				port: 5984,
    // 				db: 'dashboard',
    // 				opts: {
    // 					cache: true,
    // 					raw: false,
    // 					forceSave: true,
    // 				}
    // 			},
    // 		],
    // 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
    // 		buffer:{
    // 			size: 0,
    // 			expire:0
    // 		}
    // 	}
    // }
  ]
}
