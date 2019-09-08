'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS:NetworkInterfaces');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:NetworkInterfaces:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')


module.exports = {

  networkInterface: {
    networkInterface: new RegExp('^.+$'),

    value: function(entry_point, timestamp, value, key){
      // Object.each(value, function(iface_value, iface){
        // if(!entry_point[key][iface]) entry_point[key][iface] = {}

        // Object.each(iface_value, function(prop_value, prop){
        Object.each(value, function(prop_value, prop){
          if(!entry_point[key][prop]) entry_point[key][prop] = {}

          Object.each(prop_value, function(status_value, status){
            if(!entry_point[key][prop][status]) entry_point[key][prop][status] = {}

            entry_point[key][prop][status][timestamp] = status_value['mean']

          })

        })

      // })

      return entry_point
    },
    doc: function(entry_point, value, key){
      let networkInterface = {}

      // Object.each(value, function(iface_data, iface){
        // if(!networkInterfaces[iface]) networkInterfaces[iface] = {}

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
              range: max - min,
            };

            networkInterface[prop][status] = data

          })
        })
      // })

      entry_point[key] = Object.clone(networkInterface)


      return entry_point
    }
  },

}
