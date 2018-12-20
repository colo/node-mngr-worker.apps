'use strict'

var debug = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS:Internals');

// let networkInterfaces = {} //temp obj to save data

module.exports = {
  cpus: {
    build_key: function(entry_point, timestamp, value){
      if(!entry_point.cpus)
        entry_point.cpus = []

      Array.each(value, function(cpu, core){
        if(!entry_point.cpus[core]) entry_point.cpus[core] = {};
      });//iterate on each core

      return entry_point
    },
    build_value: function(entry_point, timestamp, value){
      Array.each(value, function(cpu, core){
        // if(!entry_point[core]) entry_point[core] = {};
        //   // values[host][path][key][core] = [];

        let data = {};
        data = {
          speed: cpu.speed,
          times: cpu.times
        };

        // //debug_internals('os-stats filter core %d', core);
        // values[host][path][key][core].push(data);
        entry_point[core][timestamp] = data
      });//iterate on each core

      return entry_point
    }

  },
  loadavg: {
    build_value: function(entry_point, timestamp, value){
      entry_point[timestamp] = value[0];//keep only "last minute" value
      return entry_point
    }
  },
  networkInterfaces: {
    // build_key: function(entry_point, timestamp, value){
    //   entry_point.networkInterfaces = undefined
    //   return entry_point
    // },
    build_value: function(entry_point, timestamp, value){
      // if(!networkInterfaces) networkInterfaces = {};

      Object.each(value, function(data, iface){
        if(!entry_point[iface]) entry_point[iface] = {}

        Object.each(data, function(val, status){//status => if | recived | transmited
          if(status == 'recived' || status == 'transmited'){
            Object.each(val, function(prop_val, prop){
              if(!entry_point[iface][prop])
                entry_point[iface][prop] = {}

              if(!entry_point[iface][prop][status])
                entry_point[iface][prop][status] = {}

              entry_point[iface][prop][status][timestamp] = prop_val
            })
          }
        })
      })

      return entry_point
    }
  },
  // post_values: function(entry_point, timestamp){
  //   let networkInterfaces = entry_point.networkInterfaces
  //   delete entry_point.networkInterfaces
  //
  //   debug_internals('networkInterfaces %o',networkInterfaces)
  //
  //   if(Object.keys(networkInterfaces).length > 0){
  //     Object.each(networkInterfaces, function(data, host){
  //       if(!entry_point['networkInterfaces']) entry_point['networkInterfaces'] = {}
  //
  //       Object.each(data, function(iface_data, iface){
  //         if(!entry_point['networkInterfaces'][iface]) entry_point['networkInterfaces'][iface] = {}
  //
  //         Object.each(iface_data, function(prop_data, prop){
  //           if(!entry_point['networkInterfaces'][iface][prop])
  //             entry_point['networkInterfaces'][iface][prop] = {}
  //
  //           Object.each(prop_data, function(status_data, status){
  //             if(!entry_point['networkInterfaces'][iface][prop][status])
  //               entry_point['networkInterfaces'][iface][prop][status] = {}
  //
  //             let counter = 0
  //             let prev = null
  //             Object.each(status_data, function(value, timestamp){
  //               if(counter == 0){
  //                 prev = value
  //               }
  //               else{
  //                 entry_point['networkInterfaces'][iface][prop][status][timestamp] = value - prev
  //                 prev = value
  //               }
  //               counter++
  //             })
  //           })
  //         })
  //       })
  //
  //       // debug_internals('networkInterfaces %o',entry_point['networkInterfaces'])
  //
  //     })
  //   }
  //
  //   return entry_point
  // }
}
