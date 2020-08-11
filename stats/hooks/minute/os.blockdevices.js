'use strict'

let debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Blockdevices'),
    debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Blockdevices:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')

let chart = require('mngr-ui-admin-charts/defaults/dygraph.derived.tabular')

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
    post_values: function(entry_point, timestamp, value, key){

      Object.each(entry_point, function(data, prop){
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
          data[ts] = doc[i][1]
        }
        entry_point[prop] = data
      })

      // debug_internals('post_values %s %o %d %o', key, value, timestamp, entry_point)
      // process.exit(1)

      return entry_point
    }

  }

}
