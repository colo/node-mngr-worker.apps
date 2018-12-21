'use strict'

let debug = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS:Blockdevices');
let debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS:Blockdevices:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
let value_to_data = require('../../libs/value.data')

module.exports = {
  dev:{
    dev: new RegExp('^[a-zA-Z0-9]+$'),
    // key: function(entry_point, timestamp, value, key){
    //   debug_internals('KEY %s', key)
    //   entry_point[key] = undefined
    //   return entry_point
    // },
    value: function(entry_point, timestamp, value, key){
      // debug_internals('KEY %s', key)
    // delete values[host][path][key]

      if(!entry_point[key][timestamp]) entry_point[key][timestamp] = {}
      Object.each(value.stats, function(val, prop){
        entry_point[key][timestamp][prop] = val * 1
      })

      return entry_point
    },
    doc: function(entry_point, value, key){
      // debug_internals('KEY %s', key)
      entry_point[key] = Object.clone(value_to_data(value, false))

      // debug_internals('os.blockdevices %o',entry_point[key])
      return entry_point
    }
  }
}
