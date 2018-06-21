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
    "cpus_minute_percentage": Object.merge(Object.clone(DefaultTabular),{
      name: function(name, chart, stats){
        // console.log('NAME', name)
        // return vm.host+'_os.cpus_times'
        return name+'_percentage'
      },
      match: /^.*os\.minute\.cpus$/,
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
    "uptime_minute": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\.minute\.uptime$/,
      watch: {
        // value: 'median',
        exclude: /samples/
      },

    }),
    "freemem_minute": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\.minute\.freemem$/,
      watch: {
        // value: 'median',
        exclude: /samples/
      },

    }),
    "loadavg_minute": Object.merge(Object.clone(DefaultTabular),{
      match: /^.*os\.minute\.loadavg$/,
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
  }
}
