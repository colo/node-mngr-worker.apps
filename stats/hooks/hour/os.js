'use strict'

let debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS'),
    debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')

let chart = require('mngr-ui-admin-charts/defaults/dygraph.derived.tabular')
const ss = require('simple-statistics')
const stat = require('../../libs/stat')

module.exports = function(){
  return {
    all: {
      all: new RegExp('^.+$'),
      // all: new RegExp('^((?!networkInterfaces|blockdevices).)*$'),
      // key: function(entry_point, timestamp, value, key, metadata){
      //   debug('blockdevices KEY', entry_point, timestamp, value, key)
      //   process.exit(1)
      //   return entry_point
      // },
      // value: function(entry_point, timestamp, value, key){
      //   debug('VALUE', entry_point, timestamp, value, key)
      //   process.exit(1)
      //   return entry_point
      // },
      doc: function(entry_point, value, key, path){
        if(path === 'os'){
          // debug('DOC %o %s %s', value, key, path) //entry_point, value, key,
          // process.exit(1)
          // if(/^((?!blockdevices|blocks).)*$/.test(key))

          if(key === 'os.uptime'){
            let seconds = []
            Object.each(value, function(data, ts){
              seconds.push(data.max)
            })

            if(seconds.length > 0)
              entry_point['uptime'] = ss.max(seconds)
          }
          else if(key === 'os.loadavg'){
            let load = []
            Object.each(value['1_min'], function(data, ts){
              load.push(data.median)
            })
            if(load.length > 0)
              entry_point['loadavg'] = ss.median(load).toFixed(2) * 1
          }
          else if(key === 'os.mounts.used'){
            Object.each(value, function(data, mount){
              // let used = Object.values(data)
              let used = []
              Object.each(data, function(_used, ts){
                used.push(_used.median)
              })
              if(!entry_point['mounts.used']) entry_point['mounts.used'] = {}
              if(used.length > 0)
                entry_point['mounts.used'][mount] = ss.median(used).toFixed(2) * 1
            })
          }
          else if(key === 'os.memory'){
            let total_median = []
            Object.each(value['totalmem'], function(data, ts){
              total_median.push(data.median)
            })
            let total = 0
            if(total_median.length > 0)
              total = ss.median(total_median)
            // let total = ss.median(Object.values(value['totalmem']))

            let free_median = []
            Object.each(value['freemem'], function(data, ts){
              free_median.push(data.median)
            })
            let free_median = 0
            if(total_median.length > 0)
              free = ss.median(free_median)
            // let free = Math.round(ss.median(Object.values(value['freemem'])))

            entry_point['memory'] = {}
            entry_point['memory']['totalmem'] = total
            entry_point['memory']['freemem'] = free
            entry_point['memory']['used'] = 100 - (((free * 100) / total).toFixed(2) * 1)
            // Object.each(value, function(data, mount){
            //   let used = Object.values(data)
            //   if(!entry_point['mounts.used']) entry_point['mounts.used'] = {}
            //   entry_point['mounts.used'][mount] = ss.median(used)
            // })
          }
          else if(/^os\.networkInterfaces\.(.*)\.bytes$/.test(key)){
            // debug('DOC %o %s %s', value, key, path) //entry_point, value, key,
            // process.exit(1)

            // debug('DOC %o %s %s', value, key, path) //entry_point, value, key,
            Object.each(value, function(data, prop){
              // let timestamps = Object.keys(data)
              // timestamps.sort((a,b)=>a-b)//sort asc order
              //
              // let prev = undefined
              let bytes = 0
              Object.each(data, function(_data, ts){
                bytes += _data.sum
              })
              // for(let i = 0; i < timestamps.length; i++){
              //   let timestamp = timestamps[i]
              //   if(i === 0){
              //     prev = data[timestamp]
              //   }
              //   else{
              //     bytes += data[timestamp] - prev
              //     prev = data[timestamp]
              //   }
              //
              // }

              let iface = /^os\.networkInterfaces\.(.*)\.bytes$/.exec(key)
              if(iface[1]){
                if(!entry_point['networkInterfaces.'+iface[1]+'.bytes']) entry_point['networkInterfaces.'+iface[1]+'.bytes'] = {}
                entry_point['networkInterfaces.'+iface[1]+'.bytes'][prop] = bytes
              }

              // debug('DOC %d %s %s', entry_point['networkInterfaces.'+iface[1]+'.bytes'][prop], key, path) //entry_point, value, key,
              // process.exit(1)
            })


          }
          else if(key === 'os.cpus'){

            // debug('DOC %s %s %s', JSON.stringify(value), key, path) //entry_point, value, key,
            // process.exit(1)

            let by_prop = { cores: [] }
            Object.each(value, function(data, prop){
              // if(prop === 'cores' || prop === 'idle'){
              //   Object.each(data, function(_data,ts){
              //     by_prop[prop].push(_data.median)
              //   })
              //
              // }
              let timestamps = Object.keys(data)
              timestamps.sort((a,b)=>a-b)//sort asc order
              // debug('DOC %o %s %s', timestamps, key, path) //entry_point, value, key,
              // process.exit(1)

              let prev = {timestamp: 0, value: 0}
              let current = []
              for(let i = 0; i < timestamps.length; i++){
                let timestamp = timestamps[i]
                if(i === 0){
                  prev = { timestamp: timestamp, value: data[timestamp].median }
                }
                else{
                  if(prop === 'cores'){
                    let time_diff = timestamp - prev.timestamp
                    current.push(data[timestamp].median * time_diff)
                  }
                  else{
                    let diff = data[timestamp].median - prev.value
                    // let time_diff = timestamp - prev.timestamp
                    current.push(diff)
                  }
                  prev = { timestamp: timestamp, value: data[timestamp].median }
                }


              }
              by_prop[prop] = current

            })

            // debug('DOC %s %s %s', JSON.stringify(by_prop), key, path) //entry_point, value, key,
            // process.exit(1)

            let idles = []
            Array.each(by_prop.cores, function(cores, index){
              let total = cores //* 1000
              let idle = by_prop.idle[index]
              idles.push( ( (idle * 100) / total ).toFixed(2) * 1 )
              // let used = 0
              // Object.each(by_prop, function(data, prop){
              //   if(prop !== 'cores'){
              //     used += data[index]
              //   }
              // })

            })
            // debug('DOC %o %s %s', idles, key, path) //entry_point, value, key,
            if(idles.length > 0)
              entry_point['cpus.idle'] = ss.median(idles).toFixed(2) * 1

            // process.exit(1)
          }

          delete entry_point[key]
        }
        else{
          // entry_point = value
          let arr = []
          Object.each(value, function(row, timestamp){
            // debug_internals('HOOK DOC KEY %s %o %o', row,timestamp)
            if(Array.isArray(row)){
              arr.combine(row)
            }
            else{
              arr.push(row)
            }
            // debug_internals('HOOK DOC KEY %s %o %o', arr)
            // process.exit(1)
          })
          entry_point[key] = stat(arr)
        }


        // process.exit(1)
        return entry_point
      }
    },
    // pre_values: function(entry_point, group, path){
    //   debug_internals('pre_values %s', JSON.stringify(group), path)
    //   // process.exit(1)
    //   if(path === 'os')
    //     entry_point = undefined
    //
    //   return entry_point
    // },

    pre_doc: function(entry_point, value, path){
      debug_internals('pre_doc %s', path)

      if(!entry_point['os']) entry_point['os'] = {}
      entry_point['os'][path] = value

      entry_point[path] = value

      return entry_point
    },


  }

}
