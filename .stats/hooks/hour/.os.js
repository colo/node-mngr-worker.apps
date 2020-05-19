'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')


module.exports = {
  cpus: {
    // key: function(entry_point, timestamp, value, key){
    //   if(!entry_point.cpus)
    //     entry_point.cpus = []
    //
    //   Array.each(value, function(cpu, core){
    //     if(!entry_point.cpus[core]) entry_point.cpus[core] = {};
    //   });//iterate on each core
    //
    //   return entry_point
    // },
    value: function(entry_point, timestamp, value, key){
      Object.each(value, function(cpu_value, cpu_key){
        if(!entry_point[key][cpu_key]) entry_point[key][cpu_key] = {};

        if(cpu_key == 'times'){
          Object.each(cpu_value, function(times_value, times_key){

            if(!entry_point[key][cpu_key][times_key])
              entry_point[key][cpu_key][times_key] = {}

            entry_point[key][cpu_key][times_key][timestamp] = times_value['mean']

          });
        }
        else{

          entry_point[key][cpu_key][timestamp] = cpu_value['mean']
        }

      });//iterate on each core

      // debug_internals('VALUE %s %o', key, entry_point[key])

      return entry_point
    },
    doc: function(entry_point, value, key){

      let speed = {};
      let times = {};

      Object.each(value, function(cpu_value, cpu_key){
        if(cpu_key == 'times'){
          Object.each(cpu_value, function(times_value, times_key){
            if(!times[times_key]) times[times_key] = {};

            let data_values = Object.values(times_value);

            let min = ss.min(data_values);
            let max = ss.max(data_values);

            times[times_key] = {
              // samples: times_value,
              min : min,
              max : max,
              mean : ss.mean(data_values),
              median : ss.median(data_values),
              mode : ss.mode(data_values),
              range: max - min,
            };
          });
        }
        else{
          let data_values = Object.values(cpu_value);

          let min = ss.min(data_values);
          let max = ss.max(data_values);

          speed = {
            // samples: cpu_value,
            min : min,
            max : max,
            mean : ss.mean(data_values),
            median : ss.median(data_values),
            mode : ss.mode(data_values),
            range: max - min,
          };
        }
      });


      entry_point[key] = {
        //samples: value,
        speed: speed,
        times: times
      }

      // debug_internals('DOC %s %o', key, entry_point[key])

      return entry_point
    },

  },

  // networkInterfaces: {
  //
  //   value: function(entry_point, timestamp, value, key){
  //     Object.each(value, function(iface_value, iface){
  //       if(!entry_point[key][iface]) entry_point[key][iface] = {}
  //
  //       Object.each(iface_value, function(prop_value, prop){
  //         if(!entry_point[key][iface][prop]) entry_point[key][iface][prop] = {}
  //
  //         Object.each(prop_value, function(status_value, status){
  //           if(!entry_point[key][iface][prop][status]) entry_point[key][iface][prop][status] = {}
  //
  //           entry_point[key][iface][prop][status][timestamp] = status_value['mean']
  //
  //         })
  //
  //       })
  //
  //     })
  //
  //     return entry_point
  //   },
  //   doc: function(entry_point, value, key){
  //     let networkInterfaces = {}
  //     Object.each(value, function(iface_data, iface){
  //       if(!networkInterfaces[iface]) networkInterfaces[iface] = {}
  //
  //       Object.each(iface_data, function(prop_data, prop){
  //         if(!networkInterfaces[iface][prop]) networkInterfaces[iface][prop] = {}
  //
  //         Object.each(prop_data, function(status_data, status){
  //           if(!networkInterfaces[iface][prop][status]) networkInterfaces[iface][prop][status] = {}
  //
  //           let data_values = Object.values(status_data);
  //           let min = ss.min(data_values);
  //           let max = ss.max(data_values);
  //
  //           let data = {
  //             // samples: status_data,
  //             min : min,
  //             max : max,
  //             mean : ss.mean(data_values),
  //             median : ss.median(data_values),
  //             mode : ss.mode(data_values),
  //             range: max - min,
  //           };
  //
  //           networkInterfaces[iface][prop][status] = data
  //
  //         })
  //       })
  //     })
  //
  //     entry_point[key] = Object.clone(networkInterfaces)
  //
  //
  //     return entry_point
  //   }
  // },

}
