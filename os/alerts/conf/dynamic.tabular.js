let DefaultTabular = require('./default.tabular')

module.exports = {
  // blacklist: /totalmem/, //don't add charts automatically for this os[key]
  blacklist: undefined,
  whitelist: undefined,
  rules: {
    "loadavg": Object.merge(Object.clone(DefaultTabular),{
      match: /os\.loadavg$/,
      watch: {
        merge: true,
        transform: function(values){
          let transformed = []

          Array.each(values, function(val, index){
            let transform = { timestamp: val.timestamp, value: val.value[0] }
            transformed.push(transform)
          })

          return transformed
        }
      },

    }),
    "cpus_percentage": Object.merge(Object.clone(DefaultTabular),{
      name: function(name, chart, stats){
        // console.log('NAME', name)
        // return vm.host+'_os.cpus_times'
        return name+'_percentage'
      },
      match: /^.*os\.cpus$/,
      /**
      * @var: save prev cpu data, need to calculate current cpu usage
      **/
      prev: {idle: 0, total: 0, timestamp: 0, value: { times: { usage: 0} } },
      /** **/
      watch: {
        merge: true,
        value: 'times',
        /**
        * @trasnform: diff between each value against its prev one
        */
        transform: function(values, caller, chart){
          // console.log('transform: ', values[0].value.times)

          let transformed = []
          // let prev = {idle: 0, total: 0, timestamp: 0 },
          Array.each(values, function(val, index){
            let transform = {timestamp: val.timestamp, value: { times: { usage: 0} } }
            let current = {idle: 0, total: 0, timestamp: val.timestamp }

            if(current.timestamp > chart.prev.timestamp){
              // if(index == 0){
              Object.each(val.value.times, function(stat, key){
                if(key == 'idle')
                  current.idle += stat

                  current.total += stat
              })


              let diff_time = current.timestamp - chart.prev.timestamp
              let diff_total = current.total - chart.prev.total;
              let diff_idle = current.idle - chart.prev.idle;

              // //////console.log('transform: ', current, chart.prev)

              //algorithm -> https://github.com/pcolby/scripts/blob/master/cpu.sh
              let percentage =  (diff_time * (diff_total - diff_idle) / diff_total ) / (diff_time * 0.01)

              if(percentage > 100){
                //console.log('cpu transform: ', diff_time, diff_total, diff_idle)
              }

              transform.value.times.usage = (percentage > 100) ? 100 : percentage


              chart.prev = Object.merge(chart.prev, Object.clone(current))
              chart.prev.value.times.usage = percentage
            }
            else{
              transform.timestamp = chart.prev.timestamp
              transform.value = chart.prev.value
            }

            transformed.push(transform)
          })

          return transformed
        }
      },


    }),
    "cpus_historical_percentage": Object.merge(Object.clone(DefaultTabular),{
      name: function(name, chart, stats){
        // console.log('NAME', name)
        // return vm.host+'_os.cpus_times'
        return name+'_percentage'
      },
      match: /^.*os\..+\.cpus$/,
      /**
      * @var: save prev cpu data, need to calculate current cpu usage
      **/
      prev: {idle: 0, total: 0, timestamp: 0, value: 0 },
      /** **/
      watch: {
        /**
        * @array allows only 3 leves deep, for anything more coplex used "managed"
        **/
        value: ['times', /^[a-zA-Z0-9_]+$/, 'median'],
        // exclude: /samples/,
        // exclude: /range|mode/,

        /**
        * returns  a bigger array (values.length * samples.length) and add each property
        */
        transform: function(values, caller, chart){
          // console.log('cpus_minute_percentage transform: ', values)


          let transformed = []
          // let prev = {idle: 0, total: 0, timestamp: 0 },
          Array.each(values, function(val, index){
            let transform = {timestamp: val.timestamp, value: 0 }
            let current = {idle: 0, total: 0, timestamp: val.timestamp }

            if(current.timestamp > chart.prev.timestamp){
              // if(index == 0){
              Object.each(val.value, function(stat, key){
                key = key.replace('times.', '').replace('.median', '')

                if(key == 'idle')
                  current.idle += stat

                  current.total += stat
              })


              let diff_time = current.timestamp - chart.prev.timestamp
              let diff_total = current.total - chart.prev.total;
              let diff_idle = current.idle - chart.prev.idle;

              // console.log('transform: ', current, chart.prev)

              //algorithm -> https://github.com/pcolby/scripts/blob/master/cpu.sh
              let percentage =  (diff_time * (diff_total - diff_idle) / diff_total ) / (diff_time * 0.01)

              // if(percentage > 100){
              //   //console.log('cpu transform: ', diff_time, diff_total, diff_idle)
              // }

              transform.value = (percentage > 100) ? 100 : percentage


              chart.prev = Object.clone(current)
              chart.prev.value = percentage


            }
            else{
              transform.timestamp = chart.prev.timestamp
              transform.value = chart.prev.value
            }

            transformed.push(transform)
            // console.log('KEY', transform)

          })


          // if(chart.prev.timestamp != current.timestamp){
          return transformed


        }
      },

    }),
    "uptime_historical": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\..+\.uptime$/,
      watch: {
        // value: 'median',
        exclude: /samples/
      },

    }),
    "freemem_historical": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\..+\.freemem$/,
      watch: {
        // value: 'median',
        exclude: /samples/
      },

    }),
    "loadavg_historical": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\..+\.loadavg$/,
      watch: {
        // value: 'median',
        exclude: /samples/
      },

    }),
    "blockdevices_stats": Object.merge(Object.clone(DefaultTabular),{
      match: /os\.blockdevices.*$/,
      /**
      * @var: save prev cpu data, need to calculate current cpu usage
      **/
      prev: { timestamp: 0, value: { stats: {} } },
      prev_transformed: { timestamp: 0, value: { stats: {} } },

      watch: {
        value: 'stats',
        /**
        * @trasnform: diff between each value against its prev one
        */
        transform: function(values, caller, chart){
          // console.log('blockdevices transform: ', values[0].value)
          // console.log('blockdevices transform: ', chart.prev)

          let transformed = []
          // let prev = null
          Array.each(values, function(val, index){
            // let transform = {timestamp: val.timestamp, value: { stats: {} } }
            let transform = Object.clone(chart.prev)

            if(val.timestamp > chart.prev.timestamp){
                Object.each(val.value.stats, function(stat, key){
                  let value = ((stat - chart.prev.value.stats[key]) > 0) ? stat - chart.prev.value.stats[key] : 0
                  transform.value.stats[key] = value
                })
              // }
              chart.prev = Object.clone(val)
              chart.prev_transformed = Object.clone(transform)
            }
            else{
              transform = Object.clone(chart.prev_transformed)
            }

            transformed.push(transform)
          })
          return transformed
        }
      }

    }),
    "mounts_percentage": Object.merge(Object.clone(DefaultTabular),{
      match: /os\.mounts\.(0|[1-9][0-9]*)$/,
      watch: {
        // merge: true,
        filters: [{
          type: /ext.*/
        }],
        value: 'percentage',
        // transform: function(values, caller, chart){
        //   console.log('mounts_percentage transform: ', values)
        //
        //   return values
        // }
      },

    }),
    "networkInterfaces": Object.merge(Object.clone(DefaultTabular), {
      match: /networkInterfaces/,
      /**
      * @var: save prev cpu data, need to calculate current cpu usage
      **/
      prev: {},
      prev_diff: {},
      // prev_transformed: { timestamp: 0, value: { stats: {} } },

      watch: {
        managed: true,
        transform: function(networkInterfaces, vm, chart, updater_callback){
          let watcher = chart.watch || {}




          // if(networkInterfaces.getLast() !== null){

            let val = networkInterfaces.getLast().value
            let ifaces = Object.keys(val)
            let properties = Object.keys(val[ifaces[0]])
            let messures = Object.keys(val[ifaces[0]][properties[1]])//properties[0] is "if", we want recived | transmited

            // let chart = Object.clone(DefaultTabular)


            Array.each(ifaces, function(iface){
              // if(!vm.stats.networkInterfaces+'.'+iface)
              //   vm.$set(vm.stats, 'networkInterfaces.'+iface, {})


              /**
              * turn data property->messure (ex: transmited { bytes: .. }),
              * to: messure->property (ex: bytes {transmited:.., recived: ... })
              **/
              Array.each(messures, function(messure){// "bytes" | "packets"
              // console.log('networkInterfaces', networkInterfaces, iface, messure)

                // if(!vm.stats[vm.host+'_os.networkInterfaces.'+iface+'.'+messure]){
                //
                //   ->vm.add_chart(vm.host+'_os.networkInterfaces.'+iface+'.'+messure, chart)
                // }
                if(!vm.charts[vm.host+'.os.networkInterfaces.'+iface+'.'+messure]){
                  vm.charts[vm.host+'.os.networkInterfaces.'+iface+'.'+messure] = chart
                  // vm.stats[vm.host+'.os.networkInterfaces.'+iface+'.'+messure] = {}
                }

                if(!chart.prev[iface]){
                  chart.prev[iface] = {}
                  chart.prev_diff[iface] = {}
                }

                if(!chart.prev[iface][messure]){
                  chart.prev[iface][messure] = {recived: undefined, transmited: undefined, timestamp: 0}
                  chart.prev_diff[iface][messure] = {recived: undefined, transmited: undefined, timestamp: 0}
                }

                let data = []

                Array.each(networkInterfaces, function(stats, index){
                  let timestamp = undefined

                  // console.log('networkInterfaces transform: ', timestamp, stats.timestamp, chart.prev.timestamp)
                  let recived = 0
                  let transmited = 0
                  // let chart.prev.recived = 0
                  // let chart.prev.transmited = 0
                  if(stats.value[iface] !== undefined && stats.timestamp >= chart.prev[iface][messure].timestamp){


                    let current_recived = stats.value[iface]['recived'][messure]
                    let current_transmited = stats.value[iface]['transmited'][messure]


                    // if(index > 0 && networkInterfaces[index - 1].value[iface]){
                    //  -> chart.prev.recived = networkInterfaces[index - 1].value[iface]['recived'][messure]
                    //  -> chart.prev.transmited = networkInterfaces[index - 1].value[iface]['transmited'][messure]
                    // }

                    // console.log('chart.prev[iface][messure].timestamp', stats.timestamp, chart.prev)
                    if(stats.timestamp != chart.prev[iface][messure].timestamp){
                      /**
                      * don't use negative, that's just for timelines graph
                      **/
                      // recived = (chart.prev[iface][messure].recived == 0) ? 0 : 0 - (current_recived - chart.prev[iface][messure].recived)//negative, so it end up ploting under X axis
                      recived = (chart.prev[iface][messure].recived == undefined) ? 0 : current_recived * 1 - chart.prev[iface][messure].recived * 1

                      transmited = (chart.prev[iface][messure].transmited == undefined) ? 0: current_transmited * 1 - chart.prev[iface][messure].transmited * 1

                      // if(messure == 'bytes'){ //bps -> Kbps
                      //     transmited = transmited / 128
                      //     recived = recived / 128
                      // }

                      chart.prev[iface][messure] = Object.clone({
                        recived: current_recived * 1,
                        transmited: current_transmited *1,
                      })

                      chart.prev[iface][messure].timestamp = stats.timestamp

                      chart.prev_diff[iface][messure] = Object.clone({
                        recived: recived * 1,
                        transmited: transmited *1,
                      })

                      chart.prev_diff[iface][messure].timestamp = stats.timestamp

                      timestamp = new Date(stats.timestamp)


                  //
                    }
                    else{
                      timestamp = new Date(chart.prev_diff[iface][messure].timestamp)
                      recived = chart.prev_diff[iface][messure].recived
                      transmited = chart.prev_diff[iface][messure].transmited
                    }

                    data.push([timestamp, recived, transmited])




                  }
                  // // else{
                  // // //   // console.log('networkInterfaces transform: ', timestamp, stats.timestamp, chart.prev.timestamp)
                  // //   data = []
                  // // //   console.log(chart.prev)
                  // // //   // // timestamp = chart.prev.timestamp
                  // // //   Object.each(chart.prev, function(iface_val, iface){
                  // // //     let val = []
                  // // //     Object.each(iface_val, function(messure_val, messure){
                  // // //       val = [new Date(messure_val.timestamp), messure_val.recived, messure_val.transmited]
                  // // //
                  // // //     })
                  // // //     data.push(val)
                  // // //   })
                  // //   ////////////////console.log('stats.value[iface] undefined', iface)
                  // //   /**
                  // //   * should notify error??
                  // //   **/
                  // // }
                })

                // vm.$set(vm.stats['os.networkInterfaces.'+iface+'.'+messure], 'data', data)
                // -> vm.update_chart_stat(vm.host+'_os.networkInterfaces.'+iface+'.'+messure, data)
                // console.log('gonna update', vm.host+'.os.networkInterfaces.'+iface+'.'+messure, data)
                updater_callback(vm.host+'.os.networkInterfaces.'+iface+'.'+messure, data)
              })

            })




          // }

          // return values
        }

      }

    }),
  }
}
