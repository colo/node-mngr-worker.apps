'use strict'

let debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Cpus'),
    debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Cpus:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')

let chart = require('mngr-ui-admin-charts/defaults/dygraph.derived.tabular')
// let chart = require('mngr-ui-admin-charts/os/cpus.tabular')

module.exports = function(){
  return {
    // all: {
    //   all: new RegExp('^.+$'),
    //   key: function(entry_point, timestamp, value, key){
    //     debug('blockdevices KEY', entry_point, timestamp, value, key)
    //   //   process.exit(1)
    //     return entry_point
    //   },
    //   value: function(entry_point, timestamp, value, key){
    //     debug('blockdevices VALUE', entry_point, timestamp, value, key)
    //     // process.exit(1)
    //     return entry_point
    //   },
    //   doc: function(entry_point, value, key){
    //     debug('blockdevices DOC', entry_point, value, key)
    //     // process.exit(1)
    //     return entry_point
    //   }
    // },
    post_values: function(entry_point){
      // debug('POST_VALUES', entry_point)
      // process.exit(1)

      let cores = entry_point.cores[Object.keys(entry_point.cores)[0]]



      Object.each(entry_point, function(data, prop){
        if(prop !== 'cores'){
          let tss = Object.keys(data)
          let values = Object.values(data)
          //transform needs and array of arrays [[ts,value]...[ts,value]]
          let doc = []
          for(let i = 0; i < tss.length; i++){
            doc[i] = [tss[i], values[i]]
          }

          doc.sort((a,b) => (a[0] > b[0]) ? 1 : ((b[0] > a[0]) ? -1 : 0))

          doc = chart.watch.transform(doc, this, chart)

          data = {}
          for(let i = 0; i < doc.length; i++){ //back to Object
            let ts = doc[i][0]


            data[ts] = (doc[i][1] > (cores * 1000 )) ? doc[i][1] / 2 : doc[i][1] //10000 was for old node version (looks like a bug, 1000 makes sense)

            if (data[ts] > (cores * 1000 )) //10000 was for old node version (looks like a bug, 1000 makes sense)
              delete data[ts]
          }
        }


        entry_point[prop] = data
      })

      entry_point.io = {}
      Object.each(entry_point.idle, function(val, ts){

        let _io = (cores * 1000 ) - (val + entry_point.irq[ts] + entry_point.nice[ts] + entry_point.sys[ts] + entry_point.user[ts]) //10000 was for old node version (looks like a bug, 1000 makes sense)
        entry_point.io[ts] = (_io < 0) ? 0 : _io
      })

      // debug('POST_VALUES', entry_point, cores)
      // process.exit(1)
      //
      return entry_point
    }

  }

}
