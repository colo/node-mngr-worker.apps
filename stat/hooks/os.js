'use strict'

var debug = require('debug')('Server:Apps:Historical:Minute:Hook:OS');
var debug_internals = require('debug')('Server:Apps:Historical:Minute:Hook:OS:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')


module.exports = {
  cpus: {
    key: function(entry_point, timestamp, value, key){
      if(!entry_point.cpus)
        entry_point.cpus = []

      Array.each(value, function(cpu, core){
        if(!entry_point.cpus[core]) entry_point.cpus[core] = {};
      });//iterate on each core

      return entry_point
    },
    value: function(entry_point, timestamp, value, key){
      Array.each(value, function(cpu, core){
        // if(!entry_point[key][core]) entry_point[key][core] = {};
        //   // values[host][path][key][core] = [];

        let data = {};
        data = {
          speed: cpu.speed,
          times: cpu.times
        };

        // //debug_internals('os-stats filter core %d', core);
        // values[host][path][key][core].push(data);
        entry_point[key][core][timestamp] = data
      });//iterate on each core

      return entry_point
    },
    doc: function(entry_point, value, key){

      let speed = {};
      let times = {};
      Array.each(value, function(sample){

        // Array.each(sample, function(cpu, core){
        Object.each(sample, function(cpu, timestamp){

          // speed.push(cpu.speed);
          speed[timestamp] = cpu.speed

          let sample_time = {};
          Object.each(cpu.times, function(time, time_key){//user,nice..etc
            if(!times[time_key]) times[time_key] = {};
              // times[time_key] = [];

            // times[time_key].push(time);
            times[time_key][timestamp] = time;

          });

        });

      });

      Object.each(times, function(time, time_key){//user,nice..etc
        let data_values = Object.values(time);

        let min = ss.min(data_values);
        let max = ss.max(data_values);

        let data = {
          // samples: time,
          min : ss.min(data_values),
          max : ss.max(data_values),
          mean : ss.mean(data_values),
          median : ss.median(data_values),
          mode : ss.mode(data_values),
          range: max - min,
        };

        times[time_key] = data;
      });

      ////console.log('SPEED', speed)
      let data_values = Object.values(speed);

      let min = ss.min(data_values);
      let max = ss.max(data_values);

      entry_point['cpus'] = {
        //samples: value,
        speed: {
          // samples: speed,
          min : ss.min(data_values),
          max : ss.max(data_values),
          mean : ss.mean(data_values),
          median : ss.median(data_values),
          mode : ss.mode(data_values),
          range: max - min,
        },
        times: times
      };

      return entry_point
    },

  },
  loadavg: {
    value: function(entry_point, timestamp, value, key){
      entry_point[key][timestamp] = value[0];//keep only "last minute" value
      return entry_point
    }
  },
  // networkInterfaces: {
  //
  //   value: function(entry_point, timestamp, value, key){
  //     // if(!networkInterfaces) networkInterfaces = {};
  //
  //     Object.each(value, function(data, iface){
  //       if(!entry_point[key][iface]) entry_point[key][iface] = {}
  //
  //       Object.each(data, function(val, status){//status => if | recived | transmited
  //         if(status == 'recived' || status == 'transmited'){
  //           Object.each(val, function(prop_val, prop){
  //             if(!entry_point[key][iface][prop])
  //               entry_point[key][iface][prop] = {}
  //
  //             if(!entry_point[key][iface][prop][status])
  //               entry_point[key][iface][prop][status] = {}
  //
  //             entry_point[key][iface][prop][status][timestamp] = prop_val * 1
  //           })
  //         }
  //       })
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
  //     debug_internals('networkInterfaces %o',networkInterfaces.lo)
  //
  //     entry_point['networkInterfaces'] = Object.clone(networkInterfaces)
  //
  //     return entry_point
  //   }
  // },
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
