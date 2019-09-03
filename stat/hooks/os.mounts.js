'use strict'

let debug = require('debug')('Server:Apps:Historical:Minute:Hook:OS:Mounts');
let debug_internals = require('debug')('Server:Apps:Historical:Minute:Hook:OS:Mounts:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
let value_to_data = require('../libs/value.data')
let os_mounts_type_filter = /^(ext.*|xfs)$/ //filter mounts

module.exports = {
  mount:{
    mount: new RegExp('^.+$'),
    key: function(entry_point, timestamp, value, key){
      // debug_internals('KEY %s', key)
      entry_point[key] = undefined //remove numerical key, gonna change it for DEVICE
      return entry_point
    },
    value: function(entry_point, timestamp, value, key){

      if(os_mounts_type_filter.test(value.type)){
        // ////debug_internals('os.mounts %o', value)

        let key = value.fs.replace('/dev/', '')

        if(!entry_point[key]) entry_point[key] = {}
          // values[host][path][key] = []

        let data = {};

        //value * 1 - type cast string -> int
        data = {
          bloks: value.bloks * 1,
          used: value.used * 1,
          availabe: value.availabe * 1,
          percentage: value.percentage * 1
        }

        // values[host][path][key].push(data);
        entry_point[key][timestamp] = data;
      }


      return entry_point
    },
    doc: function(entry_point, value, key){
      debug_internals('KEY %s %o', key, value)
      entry_point[key] = Object.clone(value_to_data(value, false))

      debug_internals('os.mounts %s %o',key, entry_point[key])
      return entry_point
    }
  }
}
