'use strict'

let debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS'),
    debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Internals');

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
          // if(/^((?!blockdevices|blocks).)*$/.test(key))
            debug('DOC %s %s', key, path) //entry_point, value, key,

          if(key === 'os.uptime'){
            let seconds = Object.values(value['seconds'])
            if(seconds.length > 0)
              entry_point['uptime'] = ss.max(seconds)
          }
          else if(key === 'os.loadavg'){
            let load = Object.values(value['1_min'])
            if(load.length > 0)
              entry_point['loadavg'] = ss.median(load).toFixed(2) * 1
          }
          else if(key === 'os.mounts.used'){
            Object.each(value, function(data, mount){
              let used = Object.values(data)
              if(!entry_point['mounts.used']) entry_point['mounts.used'] = {}
              if(used.length > 0)
                entry_point['mounts.used'][mount] = ss.median(used).toFixed(2) * 1
            })
          }
          else if(key === 'os.memory'){
            let totalmem = Object.values(value['totalmem'])
            let total = 0
            if(totalmem.length > 0)
              total = ss.median(totalmem)

            let freemem = Object.values(value['freemem'])
            let free = 0
            if(freemem.length > 0)
              free = Math.round(ss.median(freemem))

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
            Object.each(value, function(data, prop){
              let timestamps = Object.keys(data)
              timestamps.sort((a,b)=>a-b)//sort asc order

              let prev = undefined
              let bytes = 0
              for(let i = 0; i < timestamps.length; i++){
                let timestamp = timestamps[i]
                if(i === 0){
                  prev = data[timestamp]
                }
                else{
                  bytes += data[timestamp] - prev
                  prev = data[timestamp]
                }

              }
              let iface = /^os\.networkInterfaces\.(.*)\.bytes$/.exec(key)
              if(iface[1]){
                if(!entry_point['networkInterfaces.'+iface[1]+'.bytes']) entry_point['networkInterfaces.'+iface[1]+'.bytes'] = {}
                entry_point['networkInterfaces.'+iface[1]+'.bytes'][prop] = bytes
              }
              // debug('DOC %d %o', bytes, ) //entry_point, value, key,


              // if(!entry_point['mounts.used']) entry_point['mounts.used'] = {}
              // entry_point['mounts.used'][mount] = ss.median(used).toFixed(2) * 1
            })
          }
          else if(key === 'os.cpus'){

            let by_prop = { cores: [] }
            Object.each(value, function(data, prop){
              let timestamps = Object.keys(data)
              timestamps.sort((a,b)=>a-b)//sort asc order
              let prev = undefined
              let current = []
              for(let i = 0; i < timestamps.length; i++){
                let timestamp = timestamps[i]
                if(i === 0){
                  prev = data[timestamp]
                }
                else{
                  if(prop === 'cores'){
                    current.push(data[timestamp])
                  }
                  else{
                    current.push(data[timestamp] - prev)
                  }
                  prev = data[timestamp]
                }


              }
              by_prop[prop] = current
            })

            let idles = []
            Array.each(by_prop.cores, function(cores, index){
              let total = cores * 1000
              let idle = by_prop.idle[index]
              idles.push( ( (idle * 100) / total ).toFixed(2) * 1 )
              // let used = 0
              // Object.each(by_prop, function(data, prop){
              //   if(prop !== 'cores'){
              //     used += data[index]
              //   }
              // })

            })
            debug('DOC %o %s %s', idles, key, path) //entry_point, value, key,
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
    // pre_values: function(entry_point, group){
    //   debug_internals('pre_values %s', JSON.stringify(group))
    //   // process.exit(1)
    //   return entry_point
    // },
    post_values: function(entry_point, metadata, path){
      // debug_internals('post_values %s', JSON.stringify(entry_point), metadata, path)
      // process.exit(1)

      if(path === 'os.blockdevices'){
        // debug_internals('post_values %s', JSON.stringify(entry_point), metadata, path)
        // process.exit(1)
        Object.each(entry_point, function(data, prop){
          let tss = Object.keys(data)
          let values = Object.values(data)
          //transform needs and array of arrays [[ts,value]...[ts,value]]
          let doc = []
          for(let i = 0; i < tss.length; i++){
            doc[i] = [tss[i], values[i]]
          }

          doc.sort((a,b) => (a[0] > b[0]) ? 1 : ((b[0] > a[0]) ? -1 : 0))

          doc = chart.watch.transform(doc, this, chart)
          data = {}
          for(let i = 0; i < doc.length; i++){ //back to Object
            let ts = doc[i][0]
            data[ts] = doc[i][1]
          }
          entry_point[prop] = data
        })
      }
      else if(path === 'os.networkInterfaces'){
        // debug_internals('post_values %s', JSON.stringify(entry_point), metadata, path)
        // process.exit(1)
        Object.each(entry_point, function(data, prop){
          let tss = Object.keys(data)
          let values = Object.values(data)
          //transform needs and array of arrays [[ts,value]...[ts,value]]
          let doc = []
          for(let i = 0; i < tss.length; i++){
            doc[i] = [tss[i], values[i]]
          }

          doc.sort((a,b) => (a[0] > b[0]) ? 1 : ((b[0] > a[0]) ? -1 : 0))

          doc = chart.watch.transform(doc, this, chart)
          data = {}
          for(let i = 0; i < doc.length; i++){ //back to Object
            let ts = doc[i][0]
            data[ts] = doc[i][1]
          }
          entry_point[prop] = data
        })
      }


      return entry_point
    },
    pre_doc: function(entry_point, value, path){
      debug_internals('pre_doc %s', path)

      if(!entry_point['os']) entry_point['os'] = {}
      entry_point['os'][path] = value

      entry_point[path] = value

      return entry_point
    },


  }

}
