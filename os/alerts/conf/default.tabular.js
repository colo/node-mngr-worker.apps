module.exports = {
  // init: function (vue){
  // },
  pre_process: function(chart, name, stat){


    if(!chart.options || !chart.options.labels){
      if(!chart.options)
        chart.options = {}

      chart.options.labels = []

      /**
      * dynamic, like 'cpus', that is an Array (multiple cores) of Objects and we wanna watch a specific value
      * cpus[0].value[N].times[idle|irq...]
      */
      if(Array.isArray(stat[0].value)
        && chart.watch && chart.watch.value
        && stat[0].value[0][chart.watch.value]
      ){
        // //console.log('Array.isArray(stat[0].value)', stat[0].value)
        Object.each(stat[0].value[0][chart.watch.value], function(tmp, tmp_key){
          chart.options.labels.push(tmp_key)
        })

        chart.options.labels.unshift('Time')

      }
      /**
      * dynamic, like 'blockdevices', that is an Object and we wanna watch a specific value
      * stat[N].value.stats[in_flight|io_ticks...]
      */
      else if(isNaN(stat[0].value) && !Array.isArray(stat[0].value)){//an Object

        //if no "watch.value" property, everything should be manage on "trasnform" function
        if(
          chart.watch && chart.watch.managed != true
          || !chart.watch

          // && chart.watch.value
        ){
          let obj = {}

          if(chart.watch && chart.watch.value){

            if(Array.isArray(chart.watch.value)){
    					// chart_watch_value = chart.watch.value.split('/')
              if(chart.watch.value[0] instanceof RegExp){
                Object.each(stat[0].value, function(val, key){
                  /**
                  * watch out to have a good RegExp, or may keep matching keeps 'til last one
                  **/
                  if(chart.watch.value[0].test(key))
                    obj = stat[0].value[key]
                })
              }
              else{
                obj = stat[0].value[chart.watch.value[0]]
              }

              // Array.each(chart.watch.value.split('/'), function(sub_key, index){
              //   if(index != 0 && obj[sub_key])
              //     obj = obj[sub_key]
              // })

    				}
            else{
                obj = stat[0].value[chart.watch.value]
            }


          }
          else{
            obj = stat[0].value
          }

          Object.each(obj, function(tmp, tmp_key){
            if(
              !chart.watch
              || !chart.watch.exclude
              || (chart.watch.exclude && chart.watch.exclude.test(tmp_key) == false)
            )
              chart.options.labels.push(tmp_key)
          })

          chart.options.labels.unshift('Time')

          // console.log('chart.watch.value', chart.options.labels)
        }

      }
      //simple, like 'loadavg', that has 3 columns
      else if(Array.isArray(stat[0].value)){

        chart.options.labels = ['Time']

        for(let i= 0; i < stat[0].value.length; i++){//create data columns
          chart.options.labels.push(name+'_'+i)
        }


        // this.process_chart(chart, name)
      }
      //simple, like 'uptime', that has one simple Numeric value
      else if(!isNaN(stat[0].value)){//
        chart.options.labels = ['Time']

        chart.options.labels.push(name)
        // this.process_chart(chart, name)
      }

      else{
        chart = null
      }
    }

    return chart
  },
  "options": {}
}
