'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS:NetworkInterfaces');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:NetworkInterfaces:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')


module.exports = {

  networkInterface: {
    networkInterface: new RegExp('^.+$'),

    value: function(entry_point, timestamp, value, key){
      // if(!networkInterfaces) networkInterfaces = {};

      // Object.each(value, function(data, iface){
      //   if(!entry_point[key][iface]) entry_point[key][iface] = {}

        // Object.each(data, function(val, status){//status => if | recived | transmited
        Object.each(value, function(val, status){//status => if | recived | transmited
          if(status == 'recived' || status == 'transmited'){
            Object.each(val, function(prop_val, prop){
              if(!entry_point[key][prop])
                entry_point[key][prop] = {}

              if(!entry_point[key][prop][status])
                entry_point[key][prop][status] = {}

              entry_point[key][prop][status][timestamp] = prop_val * 1
            })
          }
        })
      // })

      return entry_point
    },
    doc: function(entry_point, value, key){
      let networkInterface = {}

      // let iface = key
      // Object.each(value, function(iface_data, iface){
        // if(!networkInterface) networkInterface = {}

        // Object.each(iface_data, function(prop_data, prop){
        Object.each(value, function(prop_data, prop){
          if(!networkInterface[prop]) networkInterface[prop] = {}

          Object.each(prop_data, function(status_data, status){
            if(!networkInterface[prop][status]) networkInterface[prop][status] = {}

            let data_values = Object.values(status_data);
            let min = ss.min(data_values);
            let max = ss.max(data_values);

            let data = {
              // samples: status_data,
              min : min,
              max : max,
              mean : ss.mean(data_values),
              median : ss.median(data_values),
              mode : ss.mode(data_values),
              // sum: ss.sumSimple(data_values),
              range: max - min,
            };

            networkInterface[prop][status] = data

          })
        })

      // })

      debug_internals('networkInterface %o',networkInterface)

      entry_point[key] = Object.clone(networkInterface)

      return entry_point
    }
  },

}
