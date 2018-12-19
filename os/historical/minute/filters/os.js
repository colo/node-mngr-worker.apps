'use strict'

var debug = require('debug')('Server:Apps:OS:Historical:Minute:Filter:OS');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Filter:OS:Internals');
var ss = require('simple-statistics');


module.exports = function(doc, opts, next, pipeline){
  debug_internals('doc %d %o', doc.length, doc[0])

  let first = doc[0].metadata.timestamp;
  let path = doc[0].metadata.path
  let host = doc[0].metadata.host
  debug_internals('doc %s %s', path, host)

  let last = doc[doc.length - 1].metadata.timestamp;

  let values = {};
  let networkInterfaces = {} //temp obj to save data

  if(!values[host]) values[host] = {};

  if(!values[host][path]) values[host][path] = {};

  Array.each(doc, function(d){
    let data = d.data
    let timestamp = d.metadata.timestamp;


    Object.each(data, function(value, key){
      // if(key != 'networkInterfaces' && key != 'totalmem'){
      // if(key != 'totalmem'){

        // //debug_internals('os.mounts %o', host, path, key)

        // if(!values[host][path][key]) values[host][path][key] = [];
        if(!values[host][path][key] && key == 'cpus'){
          values[host][path][key] = [];
        }
        else if(!values[host][path][key]){
          values[host][path][key] = {};
          // values[host][key] = [];
        }

        if(key == 'cpus' ){
          Array.each(value, function(cpu, core){
            if(!values[host][path][key][core]) values[host][path][key][core] = {};
              // values[host][path][key][core] = [];

            let data = {};
            data = {
              speed: cpu.speed,
              times: cpu.times
            };

            // //debug_internals('os-stats filter core %d', core);
            // values[host][path][key][core].push(data);
            values[host][path][key][core][timestamp] = data
          });//iterate on each core
        }
        else if(key == 'loadavg'){//keep only "last minute" value
          // values[host][path][key].push(value[0]);
          values[host][path][key][timestamp] = value[0];
        }
        else if (key == 'networkInterfaces' ) {
          delete values[host][path][key]

          if(!networkInterfaces[host]) networkInterfaces[host] = {};

          Object.each(value, function(data, iface){
            if(!networkInterfaces[host][iface]) networkInterfaces[host][iface] = {}

            Object.each(data, function(val, status){//status => if | recived | transmited
              if(status == 'recived' || status == 'transmited'){
                Object.each(val, function(prop_val, prop){
                  if(!networkInterfaces[host][iface][prop])
                    networkInterfaces[host][iface][prop] = {}

                  if(!networkInterfaces[host][iface][prop][status])
                    networkInterfaces[host][iface][prop][status] = {}

                  networkInterfaces[host][iface][prop][status][timestamp] = prop_val
                })
              }
            })
          })

          // debug_internals('networkInterfaces %o',networkInterfaces[host])
        }
        // else if (path == 'os.blockdevices') {//keep only stats, partitions may be done in the future
        //   // delete values[host][path][key]
        //   // values[host][path][key].push(value.stats);
        //   // values[host][path][key][timestamp] = value.stats
        //   if(!values[host][path][key][timestamp]) values[host][path][key][timestamp] = {}
        //   Object.each(value.stats, function(val, prop){
        //     values[host][path][key][timestamp][prop] = val * 1
        //   })
        //   //debug_internals('os.blockdevices %o',values[host][path][key][timestamp])
        // }
        // else if (path == 'os.mounts') {//keep only stats, partitions may be done in the future
        //   // values[host][path][key].push(value.stats);
        //
        //   delete values[host][path][key]//remove numerical key, gonna change it for DEVICE
        //
        //   if(os_mounts_type_filter.test(value.type)){
        //     // //debug_internals('os.mounts %o', value)
        //
        //     let key = value.fs.replace('/dev/', '')
        //
        //     if(!values[host][path][key]) values[host][path][key] = {}
        //       // values[host][path][key] = []
        //
        //     let data = {};
        //
        //     //value * 1 - type cast string -> int
        //     data = {
        //       bloks: value.bloks * 1,
        //       used: value.used * 1,
        //       availabe: value.availabe * 1,
        //       percentage: value.percentage * 1
        //     }
        //
        //     // values[host][path][key].push(data);
        //     values[host][path][key][timestamp] = data;
        //   }
        //   // else{
        //   //
        //   // }
        //
        //
        // }
        // else if (path == 'os.procs') {
        //   // delete values[host][path][key]
        //
        //   if(key == 'pids'){//stats only for 'pids' key...'uid' sorted is avoided
        //     Object.each(value, function(proc, pid){
        //
        //       let prop = pid+':'+proc['ppid']+':'+proc['cmd'] //pid + ppid + command
        //
        //       if(!values[host][path][key][prop]) values[host][path][key][prop] = {}
        //
        //       let data = {
        //         // '_pid': proc['pid'],
        //         // '_ppid': proc['ppid'],
        //         // '_command': proc['_command'],
        //         '%cpu': proc['%cpu'],
        //         '%mem': proc['%mem'],
        //         'rss': proc['rss'],
        //         'vsize': proc['vsize']
        //         // 'time':
        //       }
        //
        //       values[host][path][key][prop][timestamp] = data
        //
        //     })
        //   }
        //   else{//prop = uids || cmd
        //     Object.each(value, function(data, prop){
        //       if(!values[host][path][key][prop]) values[host][path][key][prop] = {}
        //       values[host][path][key][prop][timestamp] = data
        //     })
        //
        //   }
        //
        //
        //
        //
        //   // if(!values[host][path+'.uid']) values[host][path+'.uid'] = {}
        //   // if(!values[host][path+'.uid'][value['uid']]) values[host][path+'.uid'][value['uid']] = {}
        //   //
        //   // let uid_data = {
        //   // 	'%cpu': value['%cpu'],
        //   // 	'%mem': value['%mem']
        //   // 	// 'time':
        //   // }
        //   //
        //   // values[host][path+'.uid'][value['uid']][timestamp] = uid_data
        //
        //   // debug_internals('procs %o',values)
        // }
        // else if (path == 'os.procs:uid') {
        // 	// delete values[host][path][key]
        //
        // 	debug_internals('procs:uid %o',value)
        // }
        else{
          values[host][path][key][timestamp] = value;

        }


    });
  });

  // debug_internals('networkInterfaces %o', networkInterfaces)

  if(Object.keys(networkInterfaces).length > 0){
    Object.each(networkInterfaces, function(data, host){
      if(!values[host]['os']['networkInterfaces']) values[host]['os']['networkInterfaces'] = {}

      Object.each(data, function(iface_data, iface){
        if(!values[host]['os']['networkInterfaces'][iface]) values[host]['os']['networkInterfaces'][iface] = {}

        Object.each(iface_data, function(prop_data, prop){
          if(!values[host]['os']['networkInterfaces'][iface][prop])
            values[host]['os']['networkInterfaces'][iface][prop] = {}

          Object.each(prop_data, function(status_data, status){
            if(!values[host]['os']['networkInterfaces'][iface][prop][status])
              values[host]['os']['networkInterfaces'][iface][prop][status] = {}

            let counter = 0
            let prev = null
            Object.each(status_data, function(value, timestamp){
              if(counter == 0){
                prev = value
              }
              else{
                values[host]['os']['networkInterfaces'][iface][prop][status][timestamp] = value - prev
                prev = value
              }
              counter++
            })
          })
        })
      })

      // debug_internals('networkInterfaces %o',values[host]['os']['networkInterfaces'])

    })
  }

  // debug_internals('values %o', values.colo.os.networkInterfaces)

  Object.each(values, function(host_data, host){

    let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};

    Object.each(host_data, function(data, path){

      Object.each(data, function(value, key){

        //debug_internals('os-stats filter value %o', key, value);

        if(key == 'cpus' ){
          let speed = {};
          let times = {};
          Array.each(value, function(sample){

            // Array.each(sample, function(cpu, core){
            Object.each(sample, function(cpu, timestamp){

              // speed.push(cpu.speed);
              speed[timestamp] = cpu.speed

              let sample_time = {};
              Object.each(cpu.times, function(time, key){//user,nice..etc
                if(!times[key]) times[key] = {};
                  // times[key] = [];

                // times[key].push(time);
                times[key][timestamp] = time;

              });

            });

          });

          Object.each(times, function(time, key){//user,nice..etc
            let data_values = Object.values(time);

            let min = ss.min(data_values);
            let max = ss.max(data_values);

            let data = {
              samples: time,
              min : ss.min(data_values),
              max : ss.max(data_values),
              mean : ss.mean(data_values),
              median : ss.median(data_values),
              mode : ss.mode(data_values),
              range: max - min,
            };

            times[key] = data;
          });

          ////console.log('SPEED', speed)
          let data_values = Object.values(speed);

          let min = ss.min(data_values);
          let max = ss.max(data_values);

          new_doc['data'][key] = {
            //samples: value,
            speed: {
              samples: speed,
              min : ss.min(data_values),
              max : ss.max(data_values),
              mean : ss.mean(data_values),
              median : ss.median(data_values),
              mode : ss.mode(data_values),
              range: max - min,
            },
            times: times
          };
        }
        else if(key == 'networkInterfaces' ){
          // debug_internals('networkInterfaces %o',value)
          let networkInterfaces = {}
          Object.each(value, function(iface_data, iface){
            if(!networkInterfaces[iface]) networkInterfaces[iface] = {}

            Object.each(iface_data, function(prop_data, prop){
              if(!networkInterfaces[iface][prop]) networkInterfaces[iface][prop] = {}

              Object.each(prop_data, function(status_data, status){
                if(!networkInterfaces[iface][prop][status]) networkInterfaces[iface][prop][status] = {}

                let data_values = Object.values(status_data);
                let min = ss.min(data_values);
                let max = ss.max(data_values);

                let data = {
                  samples: status_data,
                  min : min,
                  max : max,
                  mean : ss.mean(data_values),
                  median : ss.median(data_values),
                  mode : ss.mode(data_values),
                  range: max - min,
                };

                networkInterfaces[iface][prop][status] = data

              })
            })
          })

          new_doc['data'][key] = Object.clone(networkInterfaces)

        }
        // else if (path == 'os.procs'){
        //
        //   // debug_internals('os.procs prop %s %o', key, value)
        //
        //   Object.each(value, function(val, prop){
        //     // debug_internals('os.procs prop %s %o', prop, val)
        //
        //     let obj_data = value_to_data(val, false)
        //
        //     if(!new_doc['data'][key]) new_doc['data'][key] = {}
        //
        //     new_doc['data'][key][prop] = Object.clone(obj_data)
        //
        //   })
        //
        // }
        // else if (
        //   path == 'os.mounts'
        //   || path == 'os.blockdevices'
        //   // || path == 'os.procs'
        // ) {
        //
        //   // if (path == 'os.procs')
        //   // 	debug_internals('os.procs data %s %o', key, value)
        //
        //   let obj_data = value_to_data(value, true)
        //
        //   new_doc['data'][key] = Object.clone(obj_data)
        //
        //   // if (path == 'os.procs')
        //     // debug_internals('os.procs data %s %o', key, new_doc['data'][key])
        // }
        else{
          let data_values = Object.values(value);
          let min = ss.min(data_values);
          let max = ss.max(data_values);

          new_doc['data'][key] = {
            samples : value,
            min : min,
            max : max,
            mean : ss.mean(data_values),
            median : ss.median(data_values),
            mode : ss.mode(data_values),
            range: max - min
          };
        }

        // let historical_path = 'os.historical'
        //
        // if(path != 'os')
        // 	historical_path = historical_path+'.'+path.replace('os.', '')

        new_doc['metadata'] = {
          type: 'minute',
          host: host,
          path: 'historical.'+path,
          range: {
            start: first,
            end: last
          }
        };



      });



      // next(new_doc, opts);
      // debug_internals('new_doc', new_doc.data)

      next(new_doc, opts, next, pipeline)

    })
  });


}
