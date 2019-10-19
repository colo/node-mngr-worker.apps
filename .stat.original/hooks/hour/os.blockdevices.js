'use strict'

let debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Blockdevices');
let debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Blockdevices:Internals');

let ss = require('simple-statistics')

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
let value_to_data = require('../../libs/value.data')

// let to_data = function(value, timestamp){
//   let data = {}
//   Object.each(value, function(internal_value, internal_key){
//     // if(internal_key.indexOf('_') != 0){
//       if(!data[internal_key]) data[internal_key] = {}
//
//       data[internal_key][timestamp] = internal_value['mean']
//     // }
//     // else{
//     //   data[internal_key] = internal_value
//     // }
//   })
//
//   return data
// }

module.exports = {
  dev:{
    dev: new RegExp('^[a-zA-Z0-9]+$'),
    // key: function(entry_point, timestamp, value, key){
    //   debug_internals('KEY %s', key)
    //   entry_point[key] = undefined
    //   return entry_point
    // },
    value: function(entry_point, timestamp, value, key){


      // entry_point[key] = Object.merge(
      //   entry_point[key],
      //   to_data(value, timestamp)
      // )
      Object.each(value, function(internal_value, internal_key){
        if(!entry_point[key][internal_key]) entry_point[key][internal_key] = {};

        entry_point[key][internal_key][timestamp] = internal_value['mean']

      });

      return entry_point
    },
    doc: function(entry_point, value, key){
      Object.each(value, function(internal_value, internal_key){

        let data_values = Object.values(internal_value);

        let min = ss.min(data_values);
        let max = ss.max(data_values);

        let obj = {
          // samples: internal_value,
          min : min,
          max : max,
          mean : ss.mean(data_values),
          median : ss.median(data_values),
          mode : ss.mode(data_values),
          range: max - min,
        };

        if(!entry_point[key]) entry_point[key] = {}

        entry_point[key][internal_key] = obj
      });


      // entry_point[key] = {
      //   //samples: value,
      //   speed: speed,
      //   times: times
      // }

      // debug_internals('DOC %s %o %o', key, entry_point[key], value)
      // process.exit(1)

      return entry_point
    }
  }
}
