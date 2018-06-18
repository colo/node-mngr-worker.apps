let DefaultTabular = require('./default.tabular')

module.exports = {
  blacklist: /totalmem/, //don't add charts automatically for this os[key]
  whitelist: null,
  rules: {
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
      prev: {idle: 0, total: 0, timestamp: 0 },
      /** **/
      watch: {
        merge: true,
        value: 'times',
        /**
        * @trasnform: diff between each value against its prev one
        */
        transform: function(values, caller, chart){
          console.log('transform: ', values)

          let transformed = []
          // let prev = {idle: 0, total: 0, timestamp: 0 },
          Array.each(values, function(val, index){
            let transform = {timestamp: val.timestamp, value: { times: { usage: 0} } }
            let current = {idle: 0, total: 0, timestamp: val.timestamp }

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


            chart.prev = Object.clone(current)
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
      prev: {idle: 0, total: 0, timestamp: 0 },
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
        transform: function(values){
          console.log('cpus_minute_percentage transform: ', values[0].value)


          // let transformed = []
          //
          // Array.each(values, function(val, index){
          //   // let transform = { timestamp: val.timestamp, value: (val.value / 1024) / 1024 }
          //   // transformed.push(transform)
          //
          //   let last_sample = null
          //   let counter = 0
          //   Object.each(val.value.samples, function(sample, timestamp){
          //     let transform = {timestamp: timestamp * 1, value: {samples: sample}}
          //
          //     if(counter == Object.getLength(val.value.samples) -1)
          //       last_sample = sample
          //
          //     Object.each(val.value, function(data, property){
          //       if(property != 'samples')
          //         transform.value[property] = data
          //     })
          //
          //     transformed.push(transform)
          //     counter++
          //   })
          //
          //   let timestamp = val.timestamp
          //   let transform = {timestamp: timestamp * 1, value: {}}
          //
          //   Object.each(val.value, function(data, property){
          //     if(property != 'samples'){
          //       transform.value[property] = data
          //     }
          //     else{
          //       transform.value['samples'] = last_sample
          //     }
          //   })
          //   transformed.push(transform)
          // })
          //
          // // //console.log('transformed: ', transformed)
          // //
          // return transformed
          return values
        }
      },

    }),
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
    // "loadavg_minute": Object.merge(Object.clone(DefaultTabular),{
    //   match: /minute\.loadavg.*/,
    //   watch: {
    //     // exclude: /samples/,
    //     exclude: /range|mode/,
    //
    //     /**
    //     * returns  a bigger array (values.length * samples.length) and add each property
    //     */
    //     transform: function(values){
    //       //console.log('loadavg_minute transform: ', values)
    //
    //
    //       let transformed = []
    //
    //       Array.each(values, function(val, index){
    //         // let transform = { timestamp: val.timestamp, value: (val.value / 1024) / 1024 }
    //         // transformed.push(transform)
    //
    //         let last_sample = null
    //         let counter = 0
    //         Object.each(val.value.samples, function(sample, timestamp){
    //           let transform = {timestamp: timestamp * 1, value: {samples: sample}}
    //
    //           if(counter == Object.getLength(val.value.samples) -1)
    //             last_sample = sample
    //
    //           Object.each(val.value, function(data, property){
    //             if(property != 'samples')
    //               transform.value[property] = data
    //           })
    //
    //           transformed.push(transform)
    //           counter++
    //         })
    //
    //         let timestamp = val.timestamp
    //         let transform = {timestamp: timestamp * 1, value: {}}
    //
    //         Object.each(val.value, function(data, property){
    //           if(property != 'samples'){
    //             transform.value[property] = data
    //           }
    //           else{
    //             transform.value['samples'] = last_sample
    //           }
    //         })
    //         transformed.push(transform)
    //       })
    //
    //       // //console.log('transformed: ', transformed)
    //       //
    //       return transformed
    //       // return values
    //     }
    //   },
    //
    // }),
  }
}
