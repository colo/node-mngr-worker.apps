'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')


module.exports = {
  loadavg: {

    loadavg: new RegExp('^0$'),// only first messure ("last minute" value)
    key: function(entry_point, timestamp, value, key){
      key = key * 1
      debug('loadavg key', entry_point, timestamp, value, key)
      if(key !== 0){
        entry_point[key] = undefined
      }
      else{
         if(!entry_point[key]) entry_point[key] = {}
        entry_point[key][timestamp] = value
      }
    //   // process.exit(1)
    //   // if(!entry_point.cpus)
    //   //   entry_point.cpus = []
    //   //
    //   // Array.each(value, function(cpu, core){
    //   //   if(!entry_point.cpus[core]) entry_point.cpus[core] = {};
    //   // });//iterate on each core
    //   //
    //   //
      return entry_point
    },
    // value: function(entry_point, timestamp, value, key){
    //   debug('loadavg value %o %d', entry_point, timestamp, value, key)
    //   process.exit(1)
    //   // entry_point[timestamp] = value;//keep only "last minute" value
    //   // return entry_point
    // }
    // post_values: function(entry_point, timestamp){
    //   debug_internals('post_values %o',entry_point, timestamp)
    //   process.exit(1)
    //   // let networkInterfaces = entry_point.networkInterfaces
    //   // delete entry_point.networkInterfaces
    //   //
    //   // debug_internals('networkInterfaces %o',networkInterfaces)
    //   //
    //   // if(Object.keys(networkInterfaces).length > 0){
    //   //   Object.each(networkInterfaces, function(data, host){
    //   //     if(!entry_point['networkInterfaces']) entry_point['networkInterfaces'] = {}
    //   //
    //   //     Object.each(data, function(iface_data, iface){
    //   //       if(!entry_point['networkInterfaces'][iface]) entry_point['networkInterfaces'][iface] = {}
    //   //
    //   //       Object.each(iface_data, function(prop_data, prop){
    //   //         if(!entry_point['networkInterfaces'][iface][prop])
    //   //           entry_point['networkInterfaces'][iface][prop] = {}
    //   //
    //   //         Object.each(prop_data, function(status_data, status){
    //   //           if(!entry_point['networkInterfaces'][iface][prop][status])
    //   //             entry_point['networkInterfaces'][iface][prop][status] = {}
    //   //
    //   //           let counter = 0
    //   //           let prev = null
    //   //           Object.each(status_data, function(value, timestamp){
    //   //             if(counter == 0){
    //   //               prev = value
    //   //             }
    //   //             else{
    //   //               entry_point['networkInterfaces'][iface][prop][status][timestamp] = value - prev
    //   //               prev = value
    //   //             }
    //   //             counter++
    //   //           })
    //   //         })
    //   //       })
    //   //     })
    //   //
    //   //
    //   //
    //   //   })
    //   // }
    //   //
    //   // return entry_point
    // }
  },

}
