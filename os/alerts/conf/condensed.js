var debug = require('debug')('condensed:os-alerts');
var debug_internals = require('debug')('condensed:os-alerts:Internals');

const LOADAVG_THRESHOLD = 5
const LOADAVG_HOUR_WARN = 10
const LOADAVG_HOUR_CRIT = 20
const LOADAVG_MINUTE_WARN = 25
const LOADAVG_MINUTE_CRIT = 15
const LOADAVG_WARN = 2
const LOADAVG_CRIT = 3

const FREEMEM_PERCENTAGE_THRESHOLD = 5
const FREEMEM_PERCENTAGE_HOUR_WARN = 35
const FREEMEM_PERCENTAGE_HOUR_CRIT = 25
const FREEMEM_PERCENTAGE_MINUTE_WARN = 25
const FREEMEM_PERCENTAGE_MINUTE_CRIT = 15
const FREEMEM_PERCENTAGE_WARN = 15
const FREEMEM_PERCENTAGE_CRIT = 5

const CPU_PERCENTAGE_THRESHOLD = 10
const CPU_PERCENTAGE_HOUR_WARN = 65
const CPU_PERCENTAGE_HOUR_CRIT = 75
const CPU_PERCENTAGE_MINUTE_WARN = 75
const CPU_PERCENTAGE_MINUTE_CRIT = 85
const CPU_PERCENTAGE_WARN = 85
const CPU_PERCENTAGE_CRIT = 95

module.exports = {


  // 'data[].%hosts': (value, payload) => {
  //   //console.log('host alert', value, payload)
  // },
  //
  // 'data[].%hosts[].%host': (value, payload) => {
  //   //console.log('each host alert', value, payload)
  // },

  // 'data[].%hosts.%path.%properties[].%property': (value, payload) => {
  //   //console.log('%property alert', value, payload)
  // },
  //

/**
*
**/

  /**
  * not in use
  *
  'data[].%hosts.os.loadavg': (value, payload) => {
    //console.log('data os.loadavg alert', value, payload)
  },
  **/

  // 'tabular[].%hosts.os.loadavg': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular[].%hosts.os.minute.loadavg': (value, payload) => {
  //           let last_minute = new Date(Date.now() - ( 60 * 1000))
  //           let result = []
  //           Array.each(value, function(val){ // [timestamp, loadavg]
  //
  //             if(val[0] >= last_minute){
  //               result = val
  //               // debug_internals('$playload tabular[].%hosts.os.minute.loadavg ', result)
  //             }
  //               // result.push(val)
  //           })
  //
  //           // debug_internals('$playload tabular[].%hosts.os.minute.loadavg ', value, result)
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       }
  //
  //   },
  //   '$callback': (value, payload) => {
  //     let host = payload.property.split('.')[1]
  //
  //     let loadavg = value[0][1]//only one val (0), with [timestamp, freemem] format
  //     let last_minute_loadavg = null
  //
  //
  //
  //     /**
  //     * last minute loadavg median for this host
  //     **/
  //
  //     Array.each(payload.extra, function(extra){//get minute.loadavg median from matching host
  //       // console.log('EXTRA', extra)
  //       Array.each(extra, function(loadavg_median){
  //         if(loadavg_median && loadavg_median.property){
  //           let extra_host = loadavg_median.property.split('.')[1]
  //
  //           if(extra_host == host && loadavg_median.value.length > 0) //extra.value = [timestamp,loadavg]
  //             last_minute_loadavg = loadavg_median.value[1] * 1
  //
  //
  //         }
  //       })
  //
  //     })
  //     // console.log('EXTRA', last_minute_loadavg)
  //
  //     if(last_minute_loadavg != null && loadavg > (last_minute_loadavg + LOADAVG_THRESHOLD))
  //       console.log('current LOADAVG_THRESHOLD', last_minute_loadavg, loadavg)
  //
  //     if(loadavg > LOADAVG_CRIT)
  //       console.log('LOADAVG_CRIT', loadavg)
  //
  //     else if(loadavg > LOADAVG_WARN)
  //       console.log('LOADAVG_WARN', loadavg)
  //
  //
  //     debug_internals('tabular[].%hosts.os.loadavg alert %d %d',
  //       last_minute_loadavg,
  //       loadavg
  //     )
  //
  //   },
  // },

  // 'data[].%hosts.os.uptime': (value, payload) => {
  //   //console.log('data os.uptime alert', value, payload)
  // },
  // 'tabular[].%hosts.os.uptime': (value, payload) => {
  //   //console.log('tabular os.uptime alert', value, payload)
  // },

  /**
  * not in use
  **/
  'data[].%hosts.os.freemem':{
    // '$payload': {
    //   '$extra':[
    //     {
    //       'tabular.%hosts.os.totalmem': (value, payload) => {
    //         // console.log('$playload tabular.%hosts.os.totalmem', value[0])
    //         return { 'value': value[0], 'property': payload.property }
    //       }
    //     },
    //     {
    //       'tabular[].%hosts.os.minute.freemem': (value, payload) => {
    //         let last_minute = new Date(Date.now() - ( 60 * 1000))
    //         // let result = []
    //         let result = undefined
    //         Array.each(value, function(val){ // [timestamp, median]
    //
    //           if(val[0] >= last_minute)
    //             result = val
    //             // result.push(val)
    //         })
    //
    //         // console.log('$playload tabular[].%hosts.os.minute.freemem', value, result)
    //         return { 'value': result, 'property': payload.property }
    //       }
    //     }
    //   ],
    // },
    '$callback': (value, payload) => {
      console.log('data os.freemem alert', value, payload.extra)
    },
  },


  // 'tabular[].%hosts.os.freemem': {
  //   '$payload': {
  //       '$extra': [
  //         {
  //           'tabular.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload tabular.%hosts.os.totalmem', value[0])
  //             return { 'value': value[0], 'property': payload.property }
  //           }
  //         },
  //         {
  //           'tabular[].%hosts.os.minute.freemem': (value, payload) => {
  //             let last_hour = new Date(Date.now() - ( 60 * 1000))
  //             // let result = []
  //             let result = undefined
  //             Array.each(value, function(val){ // [timestamp, median]
  //
  //               if(val[0] >= last_hour)
  //                 result = val
  //                 // result.push(val)
  //             })
  //
  //             // console.log('$playload tabular[].%hosts.os.minute.freemem', value, result)
  //             return { 'value': result, 'property': payload.property }
  //           }
  //         }
  //       ],
  //   },
  //   '$callback': (value, payload) => {
  //     let totalmem = undefined
  //
  //     // let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //
  //     // let last_hour_freemem = 0
  //     let freemem = value[0][1]//only one val (0), with [timestamp, freemem] format
  //     let last_minute_freemem = 0
  //
  //
  //     let freemem_percentage = 100
  //     // let last_hour_freemem_percentage = 0
  //     let last_minute_freemem_percentage = 0
  //
  //
  //
  //     /**
  //     * payload.extra[0] = totalmem
  //     **/
  //     Array.each(payload.extra[0], function(extra){//get totalmem from matching host
  //       // console.log(extra)
  //       if(extra.property){
  //         let extra_host = extra.property.split('.')[1]
  //
  //         if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,totalmem]
  //           totalmem = extra.value[1]
  //       }
  //
  //     })
  //
  //     /**
  //     * payload.extra[1] = hour.freemem
  //     * last minute freemem median for this host
  //     **/
  //
  //     Array.each(payload.extra[1], function(extra){//get hour.freemem_median from matching host
  //       // console.log('EXTRA', extra)
  //       Array.each(extra, function(freemem_median){
  //         if(freemem_median && freemem_median.property){
  //           let extra_host = freemem_median.property.split('.')[1]
  //           // console.log('EXTRA', freemem_median)
  //
  //           if(extra_host == host && freemem_median.value.length > 0) //extra.value = [timestamp,freemem]
  //             last_minute_freemem = freemem_median.value[1]
  //         }
  //       })
  //
  //     })
  //
  //
  //     /**
  //     * last minute freemem median
  //     **/
  //     // Array.each(value, function(val){// [timestamp,percentage]
  //     //   if(val[0]>= last_minute){
  //     //     last_minute_freemem = val[1]
  //     //   }
  //     // })
  //
  //     if(totalmem){
  //       if(freemem > 0)
  //         freemem_percentage = (freemem * 100 ) / totalmem
  //
  //       if(last_minute_freemem > 0)
  //         last_minute_freemem_percentage = (last_minute_freemem * 100 ) / totalmem
  //
  //
  //       if(freemem_percentage < (last_minute_freemem_percentage - FREEMEM_PERCENTAGE_THRESHOLD))
  //         console.log('current FREEMEM_PERCENTAGE_THRESHOLD', last_minute_freemem_percentage, freemem_percentage)
  //
  //       if(freemem_percentage < FREEMEM_PERCENTAGE_CRIT)
  //         console.log('FREEMEM_PERCENTAGE_CRIT', freemem_percentage)
  //
  //       else if(freemem_percentage < FREEMEM_PERCENTAGE_WARN)
  //         console.log('FREEMEM_PERCENTAGE_WARN', freemem_percentage)
  //
  //     }
  //
  //     // console.log('tabular os.minute.freemem alert', payload.extra,
  //     //   last_minute_freemem,
  //     //   last_minute_freemem_percentage,
  //     //   freemem,
  //     //   freemem_percentage
  //     // )
  //   },
  // },

  /**
  * not in use
  **/
  // 'data[].%hosts.os.cpus': (value, payload) => {
  //   console.log('data os.cpus alert', value, payload)
  // },
  /***/

  // 'tabular[].%hosts.os.cpus_percentage': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular.%hosts.os.minute.cpus_percentage': (value, payload) => {
  //           let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //           let result = undefined
  //           Array.each(value, function(val){ // [timestamp, percentage]
  //             if(val[0] >= last_minute)
  //               result = val
  //           })
  //
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       },
  //   },
  //   '$callback': (value, payload) => {
  //     // let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //
  //     // let last_hour_cpu_percentage = 0
  //     let last_minute_cpu_percentage = 0
  //     let cpu_percentage = value[0][1]//only one val (0), with [timestamp, percentage] format
  //
  //     /**
  //     * last minute cpu_percentage for this host
  //     **/
  //     Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //       if(extra.property){
  //         let extra_host = extra.property.split('.')[1]
  //
  //         if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //           last_minute_cpu_percentage = extra.value[1]
  //       }
  //     })
  //
  //     /**
  //     * cpu_percentage
  //     **/
  //     // Array.each(value, function(val){// [timestamp,percentage]
  //     //   if(val[0]>= last_minute){
  //     //     last_minute_cpu_percentage = val[1]
  //     //   }
  //     // })
  //
  //     if(cpu_percentage > (last_minute_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //       console.log('CPU_PERCENTAGE_THRESHOLD', last_minute_cpu_percentage, cpu_percentage)
  //
  //     if(cpu_percentage > CPU_PERCENTAGE_CRIT)
  //       console.log('CPU_PERCENTAGE_CRIT', cpu_percentage)
  //
  //     else if(cpu_percentage > CPU_PERCENTAGE_WARN)
  //       console.log('CPU_PERCENTAGE_WARN', cpu_percentage)
  //
  //     // console.log('tabular os.cpus_percentage alert', value, payload.extra)
  //   }
  // },

  /**
  * not in use
  *
  'data[].%hosts.os.blockdevices': (value, payload) => {
    console.log('data os.blockdevices alert', value, payload)
  },

  'tabular[].%hosts.os.blockdevices': (value, payload) => {
    // console.log('tabular os.blockdevices_stats alert', value, payload)
  },

  'data[].%hosts.os.mounts': (value, payload) => {
    //console.log('data os.mounts alert', value[4][0].value, payload)
  },
  */



  // 'tabular[].%hosts.os.mounts': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular.%hosts.os.minute.mounts': (value, payload) => {
  //           let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //           let result = undefined
  //           Array.each(value, function(val){ // [timestamp, percentage]
  //             if(val[0] >= last_minute)
  //               result = val
  //           })
  //
  //           console.log('tabular.%hosts.os.minute.mounts', value, result)
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       },
  //   },
  //   '$callback': (value, payload) => {
  //     // // let last_minute = new Date(Date.now() - (60 * 1000))
  //     // let host = payload.property.split('.')[1]
  //     //
  //     // // let last_hour_cpu_percentage = 0
  //     // let last_minute_cpu_percentage = 0
  //     // let cpu_percentage = value[0][1]//only one val (0), with [timestamp, percentage] format
  //     //
  //     // /**
  //     // * last minute cpu_percentage for this host
  //     // **/
  //     // Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //     //   if(extra.property){
  //     //     let extra_host = extra.property.split('.')[1]
  //     //
  //     //     if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //     //       last_minute_cpu_percentage = extra.value[1]
  //     //   }
  //     // })
  //
  //
  //
  //     // if(cpu_percentage > (last_minute_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //     //   console.log('CPU_PERCENTAGE_THRESHOLD', last_minute_cpu_percentage, cpu_percentage)
  //     //
  //     // if(cpu_percentage > CPU_PERCENTAGE_CRIT)
  //     //   console.log('CPU_PERCENTAGE_CRIT', cpu_percentage)
  //     //
  //     // else if(cpu_percentage > CPU_PERCENTAGE_WARN)
  //     //   console.log('CPU_PERCENTAGE_WARN', cpu_percentage)
  //
  //     debug_internals('tabular[].%hosts.os.mounts alert', value, payload.extra)
  //   }
  // },

  // 'tabular[].%hosts.os.blockdevices': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular.%hosts.os.minute.blockdevices': (value, payload) => {
  //           let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //           let result = undefined
  //           Array.each(value, function(val){ // [timestamp, percentage]
  //             if(val[0] >= last_minute)
  //               result = val
  //           })
  //
  //           // console.log('tabular.%hosts.os.minute.blockdevices', value, result)
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       },
  //   },
  //   '$callback': (value, payload) => {
  //     // // let last_minute = new Date(Date.now() - (60 * 1000))
  //     // let host = payload.property.split('.')[1]
  //     //
  //     // // let last_hour_cpu_percentage = 0
  //     // let last_minute_cpu_percentage = 0
  //     // let cpu_percentage = value[0][1]//only one val (0), with [timestamp, percentage] format
  //     //
  //     // /**
  //     // * last minute cpu_percentage for this host
  //     // **/
  //     // Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //     //   if(extra.property){
  //     //     let extra_host = extra.property.split('.')[1]
  //     //
  //     //     if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //     //       last_minute_cpu_percentage = extra.value[1]
  //     //   }
  //     // })
  //
  //
  //
  //     // if(cpu_percentage > (last_minute_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //     //   console.log('CPU_PERCENTAGE_THRESHOLD', last_minute_cpu_percentage, cpu_percentage)
  //     //
  //     // if(cpu_percentage > CPU_PERCENTAGE_CRIT)
  //     //   console.log('CPU_PERCENTAGE_CRIT', cpu_percentage)
  //     //
  //     // else if(cpu_percentage > CPU_PERCENTAGE_WARN)
  //     //   console.log('CPU_PERCENTAGE_WARN', cpu_percentage)
  //
  //     debug_internals('tabular[].%hosts.os.blockdevices alert', value, payload.extra)
  //   }
  // },

  // 'data[].%hosts.os.networkInterfaces': (value, payload) => {
  //   debug_internals('data os.networkInterfaces alert', value[0].value.lo, payload)
  //   // debug_internals('data os.networkInterfaces alert', value, payload)
  // },
  //
  //

  // 'tabular[].%hosts.os.networkInterfaces': (value, payload) => {
  //   // if(value.enp2s0)
  //   debug_internals('tabular os.networkInterfaces alert', value.lo.bytes, payload)
  // },

  // 'data[].%hosts.os.procs': {
  //
  //   '$payload': {
  //       '$extra': {
  //         'data.%hosts.os.minute.procs': (value, payload) => {
  //           let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //           let result = {}
  //           Object.each(value, function(proc, key){ // [{timestamp, percentage}]
  //             if(proc[0].timestamp >= last_minute)
  //               result[key] = proc[0].value
  //           })
  //
  //           // console.log('data[].%hosts.os.minute.procs', result)
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       },
  //   },
  //
  //   '$callback': (value, payload) => {
  //     //
  //     // let per_uid = {}
  //     //
  //     // Object.each(value, function(proc, index){
  //     //   // debug_internals('data[].%hosts.os.procs alert', proc[0].value.uid)
  //     //   if(!per_uid[proc[0].value.uid]) per_uid[proc[0].value.uid] = {count : 0}
  //     //
  //     //   Object.each(proc[0].value, function(val, prop){
  //     //
  //     //     if(prop == '%cpu' || prop == '%mem' || prop == 'time'){
  //     //       if(!per_uid[proc[0].value.uid][prop]) per_uid[proc[0].value.uid][prop] = 0
  //     //
  //     //       per_uid[proc[0].value.uid][prop] += val
  //     //     }
  //     //
  //     //     if(!per_uid[proc[0].value.uid]['pids']) per_uid[proc[0].value.uid]['pids'] = []
  //     //
  //     //     per_uid[proc[0].value.uid]['pids'].push(proc[0].value.pid)
  //     //
  //     //   })
  //     //
  //     // })
  //
  //     debug_internals('data[].%hosts.os.procs alert',
  //       value,
  //       // per_uid,
  //       payload
  //     )
  //   }
  // },

  // 'data[].%hosts.os.procs:uid': {
  //
  //   '$payload': {
  //       '$extra': [
  //         {
  //           'data.%hosts.os.minute.procs': (value, payload) => {
  //             let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //             let result = {}
  //             Object.each(value, function(proc, key){ // [{timestamp, percentage}]
  //               if(proc[0].timestamp >= last_minute)
  //                 result[key] = proc[0].value
  //             })
  //
  //             // console.log('data[].%hosts.os.minute.procs', result)
  //             return { 'value': result, 'property': payload.property }
  //           }
  //         },
  //         {
  //           'data.%hosts.os.minute.procs:uid': (value, payload) => {
  //             let last_minute = new Date(Date.now() - (60 * 1000))
  //
  //             let result = {}
  //             Object.each(value, function(proc, key){ // [{timestamp, percentage}]
  //               if(proc[0].timestamp >= last_minute)
  //                 result[key] = proc[0].value
  //             })
  //
  //             // console.log('data[].%hosts.os.minute.procs:uid', result)
  //             return { 'value': result, 'property': payload.property }
  //           }
  //         },
  //     ]
  //   },
  //
  //   '$callback': (value, payload) => {
  //
  //     let per_uid = {}
  //
  //     Object.each(value, function(proc, index){
  //       // debug_internals('data[].%hosts.os.procs alert', proc[0].value.uid)
  //       if(!per_uid[proc[0].value.uid]) per_uid[proc[0].value.uid] = {count : 0}
  //
  //       Object.each(proc[0].value, function(val, prop){
  //
  //         if(prop == '%cpu' || prop == '%mem' || prop == 'time'){
  //           if(!per_uid[proc[0].value.uid][prop]) per_uid[proc[0].value.uid][prop] = 0
  //
  //           per_uid[proc[0].value.uid][prop] += val
  //         }
  //
  //         if(!per_uid[proc[0].value.uid]['pids']) per_uid[proc[0].value.uid]['pids'] = []
  //
  //         per_uid[proc[0].value.uid]['pids'].push(proc[0].value.pid)
  //
  //       })
  //
  //     })
  //
  //     debug_internals('data[].%hosts.os.procs:uid alert',
  //       value,
  //       // per_uid,
  //       payload
  //     )
  //   }
  // },


/**
* @minute
**/

  /**
  * not in use
  'data[].%hosts.os.minute.loadavg': (value, payload) => {
    //console.log('data os.minute.loadavg alert', value, payload)
  },
  **/
  //
  // 'tabular[].%hosts.os.minute.loadavg': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular[].%hosts.os.hour.loadavg': (value, payload) => {
  //           let last_hour = new Date(Date.now() - ( 60 * 60 * 1000))
  //           let result = undefined
  //           Array.each(value, function(val){ // [timestamp, loadavg]
  //
  //             if(val[0] >= last_hour)
  //               result = val
  //               // result.push(val)
  //           })
  //
  //           // console.log('$playload tabular[].%hosts.os.hour.loadavg', value, result)
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       }
  //
  //   },
  //   '$callback': (value, payload) => {
  //     let host = payload.property.split('.')[1]
  //
  //     let last_hour_loadavg = undefined
  //     let last_minute_loadavg = value[0][1]//only one val (0), with [timestamp, freemem] format
  //
  //
  //
  //     /**
  //     * last hour loadavg median for this host
  //     **/
  //
  //     Array.each(payload.extra, function(extra){//get minute.loadavg median from matching host
  //       // console.log('EXTRA', extra)
  //       Array.each(extra, function(loadavg_median){
  //         if(loadavg_median && loadavg_median.property){
  //           let extra_host = loadavg_median.property.split('.')[1]
  //           // console.log('EXTRA', loadavg_median)
  //
  //           if(extra_host == host && loadavg_median.value.length > 0) //extra.value = [timestamp,loadavg]
  //             last_hour_loadavg = loadavg_median.value[1]
  //         }
  //       })
  //
  //     })
  //
  //     if(last_hour_loadavg && last_minute_loadavg > (last_hour_loadavg + LOADAVG_THRESHOLD))
  //       console.log('minute LOADAVG_THRESHOLD', last_hour_loadavg, last_minute_loadavg)
  //
  //       if(last_minute_loadavg > LOADAVG_MINUTE_CRIT)
  //         console.log('LOADAVG_MINUTE_CRIT', last_minute_loadavg)
  //
  //       else if(last_minute_loadavg > LOADAVG_MINUTE_WARN)
  //         console.log('LOADAVG_MINUTE_WARN', last_minute_loadavg)
  //
  //
  //     debug_internals('tabular[].%hosts.os.minute.loadavg alert',
  //       last_hour_loadavg,
  //       last_minute_loadavg
  //     )
  //
  //   },
  // },
  //
  // 'data[].%hosts.os.minute.uptime': (value, payload) => {
  //   //console.log('data os.minute.uptime alert', value, payload)
  // },
  //
  // 'tabular[].%hosts.os.minute.uptime': (value, payload) => {
  //   //console.log('tabular os.minute.uptime alert', value, payload)
  // },

  /**
  * not in use
  *
  'data[].%hosts.os.minute.freemem':{
    '$payload': {
      '$extra': [
        {
          'tabular.%hosts.os.totalmem': (value, payload) => {
            // console.log('$playload tabular.%hosts.os.totalmem', value[0])
            return { 'value': value[0], 'property': payload.property }
          }
        },
        {
          'tabular[].%hosts.os.hour.freemem': (value, payload) => {
            let last_hour = new Date(Date.now() - (60 * 60 * 1000))
            // let result = []
            let result = undefined
            Array.each(value, function(val){ // [timestamp, median]

              if(val[0] >= last_hour)
                result = val
                // result.push(val)
            })

            console.log('$playload tabular[].%hosts.os.hour.freemem', value, result)
            return { 'value': result, 'property': payload.property }
          }
        }
      ],
    },
    '$callback': (value, payload) => {
      let totlamem = payload.extra[0].value

      //console.log('data os.minute.freemem alert', value, payload)
    },
  },
  **/
  //
  // 'tabular[].%hosts.os.minute.freemem':{
  //   '$payload': {
  //       '$extra': [
  //         {
  //           'tabular.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload tabular.%hosts.os.totalmem', value[0])
  //             return { 'value': value[0], 'property': payload.property }
  //           }
  //         },
  //         {
  //           'tabular[].%hosts.os.hour.freemem': (value, payload) => {
  //             let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //             // let result = []
  //             let result = undefined
  //             Array.each(value, function(val){ // [timestamp, median]
  //
  //               if(val[0] >= last_hour)
  //                 result = val
  //                 // result.push(val)
  //             })
  //
  //             // console.log('$playload tabular[].%hosts.os.hour.freemem', value, result)
  //             return { 'value': result, 'property': payload.property }
  //           }
  //         }
  //       ],
  //   },
  //   '$callback': (value, payload) => {
  //     let totalmem = undefined
  //
  //     let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //
  //     let last_hour_freemem = 0
  //     let last_minute_freemem = 0
  //     let last_hour_freemem_percentage = 0
  //     let last_minute_freemem_percentage = 100
  //
  //
  //
  //     /**
  //     * payload.extra[0] = totalmem
  //     **/
  //     Array.each(payload.extra[0], function(extra){//get totalmem from matching host
  //       // console.log(extra)
  //       if(extra.property){
  //         let extra_host = extra.property.split('.')[1]
  //
  //         if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,totalmem]
  //           totalmem = extra.value[1]
  //       }
  //
  //     })
  //
  //     /**
  //     * payload.extra[1] = hour.freemem
  //     * last hour freemem median for this host
  //     **/
  //
  //     Array.each(payload.extra[1], function(extra){//get hour.freemem_median from matching host
  //       // console.log('EXTRA', extra)
  //       Array.each(extra, function(freemem_median){
  //         if(freemem_median && freemem_median.property){
  //           let extra_host = freemem_median.property.split('.')[1]
  //           // console.log('EXTRA', freemem_median)
  //
  //           if(extra_host == host && freemem_median.value.length > 0) //extra.value = [timestamp,freemem]
  //             last_hour_freemem = freemem_median.value[1]
  //         }
  //       })
  //
  //     })
  //
  //
  //     /**
  //     * last minute freemem median
  //     **/
  //     Array.each(value, function(val){// [timestamp,percentage]
  //       if(val[0]>= last_minute){
  //         last_minute_freemem = val[1]
  //       }
  //     })
  //
  //     if(last_hour_freemem > 0 && totalmem)
  //       last_hour_freemem_percentage = (last_hour_freemem * 100 ) / totalmem
  //
  //     if(last_minute_freemem > 0 && totalmem)
  //       last_minute_freemem_percentage = (last_minute_freemem * 100 ) / totalmem
  //
  //
  //     if(last_minute_freemem_percentage < (last_hour_freemem_percentage - FREEMEM_PERCENTAGE_THRESHOLD))
  //       console.log('minute FREEMEM_PERCENTAGE_THRESHOLD', last_hour_freemem_percentage, last_minute_freemem_percentage)
  //
  //     if(last_minute_freemem_percentage < FREEMEM_PERCENTAGE_MINUTE_CRIT)
  //       console.log('FREEMEM_PERCENTAGE_MINUTE_CRIT', last_minute_freemem_percentage)
  //
  //     else if(last_minute_freemem_percentage < FREEMEM_PERCENTAGE_MINUTE_WARN)
  //       console.log('FREEMEM_PERCENTAGE_MINUTE_WARN', last_minute_freemem_percentage)
  //
  //
  //     debug_internals('tabular os.minute.freemem alert',
  //       last_hour_freemem,
  //       last_hour_freemem_percentage,
  //       last_minute_freemem,
  //       last_minute_freemem_percentage
  //     )
  //   },
  // },

  /**
  * not in use
  *
  'data[].%hosts.os.minute.cpus': (value, payload) => {
    //console.log('data os.minute.cpus alert', value, payload)
  },
  **/

  //
  // 'tabular[].%hosts.os.minute.cpus_percentage': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular.%hosts.os.hour.cpus_percentage': (value, payload) => {
  //           let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //           // let result = []
  //           let result = undefined
  //           Array.each(value, function(val){ // [timestamp, percentage]
  //             if(val[0] >= last_hour)
  //               result = val
  //               // result.push(val)
  //           })
  //
  //           return { 'value': result, 'property': payload.property }
  //         }
  //       },
  //   },
  //   '$callback': (value, payload) => {
  //     let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //
  //     let last_hour_cpu_percentage = 0
  //     let last_minute_cpu_percentage = 0
  //
  //
  //     /**
  //     * last hour cpu_percentage for this host
  //     **/
  //     Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //       if(extra.property){
  //         let extra_host = extra.property.split('.')[1]
  //
  //         if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //           last_hour_cpu_percentage = extra.value[1]
  //       }
  //     })
  //
  //     /**
  //     * last minute cpu_percentage
  //     **/
  //     Array.each(value, function(val){// [timestamp,percentage]
  //       if(val[0]>= last_minute){
  //         last_minute_cpu_percentage = val[1]
  //       }
  //     })
  //
  //     if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //       console.log('CPU_PERCENTAGE_THRESHOLD', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //
  //     if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_CRIT)
  //       console.log('CPU_PERCENTAGE_MINUTE_CRIT', last_minute_cpu_percentage)
  //
  //     else if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_WARN)
  //       console.log('CPU_PERCENTAGE_MINUTE_WARN', last_minute_cpu_percentage)
  //
  //     debug_internals('tabular os.minute.cpus_percentage alert',
  //       last_hour_cpu_percentage,
  //       last_minute_cpu_percentage
  //     )
  //   }
  // },
  //
  //

  /**
  * not in use
  *
  'data[].%hosts.os.minute.mounts': (value, payload) => {
    //console.log('data os.minute.cpus alert', value, payload)
  },
  **/


  // 'tabular[].%hosts.os.minute.mounts': {
  //   // '$payload': {
  //   //     '$extra': {
  //   //       'tabular.%hosts.os.hour.cpus_percentage': (value, payload) => {
  //   //         let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //   //         // let result = []
  //   //         let result = undefined
  //   //         Array.each(value, function(val){ // [timestamp, percentage]
  //   //           if(val[0] >= last_hour)
  //   //             result = val
  //   //             // result.push(val)
  //   //         })
  //   //
  //   //         return { 'value': result, 'property': payload.property }
  //   //       }
  //   //     },
  //   // },
  //   '$callback': (value, payload) => {
  //     let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //     //
  //     // let last_hour_cpu_percentage = 0
  //     // let last_minute_cpu_percentage = 0
  //     //
  //     //
  //     // /**
  //     // * last hour cpu_percentage for this host
  //     // **/
  //     // Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //     //   if(extra.property){
  //     //     let extra_host = extra.property.split('.')[1]
  //     //
  //     //     if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //     //       last_hour_cpu_percentage = extra.value[1]
  //     //   }
  //     // })
  //     //
  //     // /**
  //     // * last minute cpu_percentage
  //     // **/
  //     // Array.each(value, function(val){// [timestamp,percentage]
  //     //   if(val[0]>= last_minute){
  //     //     last_minute_cpu_percentage = val[1]
  //     //   }
  //     // })
  //     //
  //     // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //     //   console.log('CPU_PERCENTAGE_THRESHOLD', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //     //
  //     // if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_CRIT)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_CRIT', last_minute_cpu_percentage)
  //     //
  //     // else if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_WARN)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_WARN', last_minute_cpu_percentage)
  //
  //     debug_internals('tabular os.minute.mounts alert %O %O',
  //       value,
  //       payload
  //     )
  //   }
  // },

  // 'tabular[].%hosts.os.minute.blockdevices': {
  //   // '$payload': {
  //   //     '$extra': {
  //   //       'tabular.%hosts.os.hour.cpus_percentage': (value, payload) => {
  //   //         let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //   //         // let result = []
  //   //         let result = undefined
  //   //         Array.each(value, function(val){ // [timestamp, percentage]
  //   //           if(val[0] >= last_hour)
  //   //             result = val
  //   //             // result.push(val)
  //   //         })
  //   //
  //   //         return { 'value': result, 'property': payload.property }
  //   //       }
  //   //     },
  //   // },
  //   '$callback': (value, payload) => {
  //     let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //     //
  //     // let last_hour_cpu_percentage = 0
  //     // let last_minute_cpu_percentage = 0
  //     //
  //     //
  //     // /**
  //     // * last hour cpu_percentage for this host
  //     // **/
  //     // Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //     //   if(extra.property){
  //     //     let extra_host = extra.property.split('.')[1]
  //     //
  //     //     if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //     //       last_hour_cpu_percentage = extra.value[1]
  //     //   }
  //     // })
  //     //
  //     // /**
  //     // * last minute cpu_percentage
  //     // **/
  //     // Array.each(value, function(val){// [timestamp,percentage]
  //     //   if(val[0]>= last_minute){
  //     //     last_minute_cpu_percentage = val[1]
  //     //   }
  //     // })
  //     //
  //     // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //     //   console.log('CPU_PERCENTAGE_THRESHOLD', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //     //
  //     // if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_CRIT)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_CRIT', last_minute_cpu_percentage)
  //     //
  //     // else if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_WARN)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_WARN', last_minute_cpu_percentage)
  //
  //     debug_internals('tabular os.minute.blockdevices alert %O %O',
  //       value,
  //       payload
  //     )
  //   }
  // },

  // 'tabular[].%hosts.os.minute.networkInterfaces': {
  //   // '$payload': {
  //   //     '$extra': {
  //   //       'tabular.%hosts.os.hour.cpus_percentage': (value, payload) => {
  //   //         let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //   //         // let result = []
  //   //         let result = undefined
  //   //         Array.each(value, function(val){ // [timestamp, percentage]
  //   //           if(val[0] >= last_hour)
  //   //             result = val
  //   //             // result.push(val)
  //   //         })
  //   //
  //   //         return { 'value': result, 'property': payload.property }
  //   //       }
  //   //     },
  //   // },
  //   '$callback': (value, payload) => {
  //     let last_minute = new Date(Date.now() - (60 * 1000))
  //     let host = payload.property.split('.')[1]
  //     //
  //     // let last_hour_cpu_percentage = 0
  //     // let last_minute_cpu_percentage = 0
  //     //
  //     //
  //     // /**
  //     // * last hour cpu_percentage for this host
  //     // **/
  //     // Array.each(payload.extra, function(extra){//get hour.cpu_percentage from matching host
  //     //   if(extra.property){
  //     //     let extra_host = extra.property.split('.')[1]
  //     //
  //     //     if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,percentage]
  //     //       last_hour_cpu_percentage = extra.value[1]
  //     //   }
  //     // })
  //     //
  //     // /**
  //     // * last minute cpu_percentage
  //     // **/
  //     // Array.each(value, function(val){// [timestamp,percentage]
  //     //   if(val[0]>= last_minute){
  //     //     last_minute_cpu_percentage = val[1]
  //     //   }
  //     // })
  //     //
  //     // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //     //   console.log('CPU_PERCENTAGE_THRESHOLD', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //     //
  //     // if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_CRIT)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_CRIT', last_minute_cpu_percentage)
  //     //
  //     // else if(last_minute_cpu_percentage > CPU_PERCENTAGE_MINUTE_WARN)
  //     //   console.log('CPU_PERCENTAGE_MINUTE_WARN', last_minute_cpu_percentage)
  //
  //     debug_internals('tabular os.minute.networkInterfaces alert %O %O',
  //       value,
  //       payload
  //     )
  //   }
  // },


  // 'data[].%hosts.os.minute.procs': {
  //
  //   '$payload': {
  //       '$extra': {
  //         'data.%hosts.os.hour.procs': (value, payload) => {
  //           let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //
  //           let result = {}
  //           Object.each(value, function(proc, key){ // [{timestamp, percentage}]
  //             if(proc[0].timestamp >= last_hour)
  //               result[key] = proc[0].value
  //           })
  //
  //           // console.log('data.%hosts.os.hour.procs', result)
  //           return { 'value': value, 'property': payload.property }
  //         }
  //       },
  //   },
  //
  //   '$callback': (value, payload) => {
  //     //
  //     // let per_uid = {}
  //     //
  //     // Object.each(value, function(proc, index){
  //     //   // debug_internals('data[].%hosts.os.procs alert', proc[0].value.uid)
  //     //   if(!per_uid[proc[0].value.uid]) per_uid[proc[0].value.uid] = {count : 0}
  //     //
  //     //   Object.each(proc[0].value, function(val, prop){
  //     //
  //     //     if(prop == '%cpu' || prop == '%mem' || prop == 'time'){
  //     //       if(!per_uid[proc[0].value.uid][prop]) per_uid[proc[0].value.uid][prop] = 0
  //     //
  //     //       per_uid[proc[0].value.uid][prop] += val
  //     //     }
  //     //
  //     //     if(!per_uid[proc[0].value.uid]['pids']) per_uid[proc[0].value.uid]['pids'] = []
  //     //
  //     //     per_uid[proc[0].value.uid]['pids'].push(proc[0].value.pid)
  //     //
  //     //   })
  //     //
  //     // })
  //
  //     debug_internals('data[].%hosts.os.minute.procs alert',
  //       // value,
  //       // per_uid,
  //       payload
  //     )
  //   }
  // },

  // 'data[].%hosts.os.minute.procs:uid': {
  //
  //   '$payload': {
  //       '$extra': {
  //         'data.%hosts.os.hour.procs:uid': (value, payload) => {
  //           let last_hour = new Date(Date.now() - (60 * 60 * 1000))
  //
  //           let result = {}
  //           Object.each(value, function(proc, key){ // [{timestamp, percentage}]
  //             if(proc[0].timestamp >= last_hour)
  //               result[key] = proc[0].value
  //           })
  //
  //           // console.log('data.%hosts.os.hour.procs', result)
  //           return { 'value': value, 'property': payload.property }
  //         }
  //       },
  //   },
  //
  //   '$callback': (value, payload) => {
  //     //
  //     // let per_uid = {}
  //     //
  //     // Object.each(value, function(proc, index){
  //     //   // debug_internals('data[].%hosts.os.procs alert', proc[0].value.uid)
  //     //   if(!per_uid[proc[0].value.uid]) per_uid[proc[0].value.uid] = {count : 0}
  //     //
  //     //   Object.each(proc[0].value, function(val, prop){
  //     //
  //     //     if(prop == '%cpu' || prop == '%mem' || prop == 'time'){
  //     //       if(!per_uid[proc[0].value.uid][prop]) per_uid[proc[0].value.uid][prop] = 0
  //     //
  //     //       per_uid[proc[0].value.uid][prop] += val
  //     //     }
  //     //
  //     //     if(!per_uid[proc[0].value.uid]['pids']) per_uid[proc[0].value.uid]['pids'] = []
  //     //
  //     //     per_uid[proc[0].value.uid]['pids'].push(proc[0].value.pid)
  //     //
  //     //   })
  //     //
  //     // })
  //
  //     debug_internals('data[].%hosts.os.minute.procs:uid alert',
  //       value,
  //       // per_uid,
  //       payload
  //     )
  //   }
  // },

  /**
  * @hour
  **/

  /**
  * not in use
  *
  'data[].%hosts.os.hour.loadavg': (value, payload) => {
    //console.log('data os.hour.loadavg alert', value, payload)
  },
  */

  // 'tabular[].%hosts.os.hour.loadavg': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   let last_hour_loadavg = 0
  //
  //   Array.each(value, function(val){// [timestamp,loadavg]
  //     if(val[0]>= last_hour)
  //       last_hour_loadavg = val[1]
  //
  //   })
  //
  //   // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //
  //   if(last_hour_loadavg > LOADAVG_HOUR_CRIT)
  //     console.log('LOADAVG_HOUR_CRIT', last_hour_loadavg)
  //
  //   else if(last_hour_loadavg > LOADAVG_HOUR_WARN)
  //     console.log('LOADAVG_HOUR_WARN', last_hour_loadavg)
  //
  //   debug_internals('tabular[].%hosts.os.hour.loadavg alert', last_hour_loadavg)
  //
  // },

  /**
  * not in use
  *
  'data[].%hosts.os.hour.uptime': (value, payload) => {
    //console.log('data os.hour.uptime alert', value, payload)
  },


  'tabular[].%hosts.os.hour.uptime': (value, payload) => {
    let last_hour = Date.now() - (60 * 60 * 1000)
    let host = payload.property.split('.')[1]
    let last_hour_uptime = 0

    Array.each(value, function(val){// [timestamp,percentage]
      if(val[0]>= last_hour)
        last_hour_uptime = val[1]

    })

    // if(last_hour_uptime > CPU_PERCENTAGE_HOUR_CRIT)
    //   console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
    //
    // else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
    //   console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)

    debug_internals('tabular os.hour.uptime alert', last_hour_uptime)
  },
  **/

  /**
  * not in use
  *
  'data[].%hosts.os.hour.freemem':{
    '$payload': {
        '$extra': {
          'tabular.%hosts.os.totalmem': (value, payload) => {
            // //console.log('$playload loadavg alert', payload)
            return { 'value': value, 'property': payload.property }
          }
        },

    },
    '$callback': (value, payload) => {
      //console.log('data os.hour.freemem alert', value, payload)
    },
  },
  **/
  //
  // 'tabular[].%hosts.os.hour.freemem': {
  //   '$payload': {
  //       '$extra': {
  //         'tabular.%hosts.os.totalmem': (value, payload) => {
  //           // //console.log('$playload loadavg alert', payload)
  //           return { 'value': value[0], 'property': payload.property }
  //         }
  //       },
  //
  //   },
  //   '$callback': (value, payload) => {
  //     let last_hour = Date.now() - (60 * 60 * 1000)
  //     let host = payload.property.split('.')[1]
  //     let last_hour_freemem = 0
  //     let last_hour_freemem_percentage = 100
  //
  //     /**
  //     * payload.extra[0] = totalmem
  //     **/
  //     Array.each(payload.extra, function(extra){//get totalmem from matching host
  //       // console.log('EXTRA', extra)
  //       if(extra.property){
  //         let extra_host = extra.property.split('.')[1]
  //
  //         if(extra_host == host && extra.value.length > 0) //extra.value = [timestamp,totalmem]
  //           totalmem = extra.value[1]
  //       }
  //
  //     })
  //
  //     Array.each(value, function(val){// [timestamp,percentage]
  //       if(val[0]>= last_hour)
  //         last_hour_freemem = val[1]
  //
  //     })
  //
  //     if(totalmem){
  //       if(last_hour_freemem > 0)
  //         last_hour_freemem_percentage = (last_hour_freemem * 100 ) / totalmem
  //
  //       // // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //       // //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //       //
  //       if(last_hour_freemem_percentage < FREEMEM_PERCENTAGE_HOUR_CRIT)
  //         console.log('FREEMEM_PERCENTAGE_HOUR_CRIT', last_hour_freemem_percentage)
  //
  //       else if(last_hour_freemem_percentage < FREEMEM_PERCENTAGE_HOUR_WARN)
  //         console.log('FREEMEM_PERCENTAGE_HOUR_WARN', last_hour_freemem_percentage)
  //
  //     }
  //
  //     debug_internals('tabular tabular[].%hosts.os.hour.freemem alert', last_hour_freemem_percentage)
  //   },
  // },

  /**
  * not in use
  *
  'data[].%hosts.os.hour.cpus': (value, payload) => {
    // console.log('data os.hour.cpus alert', value, payload)
  },
  **/
  //
  // 'tabular[].%hosts.os.hour.cpus_percentage': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   let last_hour_cpu_percentage = 0
  //
  //   Array.each(value, function(val){// [timestamp,percentage]
  //     if(val[0]>= last_hour)
  //       last_hour_cpu_percentage = val[1]
  //
  //   })
  //
  //   // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //
  //   if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_CRIT)
  //     console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
  //
  //   else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
  //     console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)
  //
  //   debug_internals('tabular os.hour.cpus_percentage alert', last_hour_cpu_percentage)
  // },
  //

  /**
  * not in use
  *
  'data[].%hosts.os.hour.mounts': (value, payload) => {
    // console.log('data os.hour.cpus alert', value, payload)
  },
  **/

  // 'tabular[].%hosts.os.hour.mounts': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   // let last_hour_cpu_percentage = 0
  //   //
  //   // Array.each(value, function(val){// [timestamp,percentage]
  //   //   if(val[0]>= last_hour)
  //   //     last_hour_cpu_percentage = val[1]
  //   //
  //   // })
  //   //
  //   // // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   // //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //   //
  //   // if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_CRIT)
  //   //   console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
  //   //
  //   // else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
  //   //   console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)
  //
  //   debug_internals('tabular os.hour.mounts alert %O %O', value, payload)
  // },

  // 'tabular[].%hosts.os.hour.blockdevices': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   // let last_hour_cpu_percentage = 0
  //   //
  //   // Array.each(value, function(val){// [timestamp,percentage]
  //   //   if(val[0]>= last_hour)
  //   //     last_hour_cpu_percentage = val[1]
  //   //
  //   // })
  //   //
  //   // // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   // //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //   //
  //   // if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_CRIT)
  //   //   console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
  //   //
  //   // else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
  //   //   console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)
  //
  //   debug_internals('tabular os.hour.blockdevices alert %O %O', value, payload)
  // },

  // 'data[].%hosts.os.hour.networkInterfaces': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   // let last_hour_cpu_percentage = 0
  //   //
  //   // Array.each(value, function(val){// [timestamp,percentage]
  //   //   if(val[0]>= last_hour)
  //   //     last_hour_cpu_percentage = val[1]
  //   //
  //   // })
  //   //
  //   // // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   // //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //   //
  //   // if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_CRIT)
  //   //   console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
  //   //
  //   // else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
  //   //   console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)
  //
  //   debug_internals('data os.hour.networkInterfaces alert %O %O', value, payload)
  // },

  // 'tabular[].%hosts.os.hour.networkInterfaces': (value, payload) => {
  //   let last_hour = Date.now() - (60 * 60 * 1000)
  //   let host = payload.property.split('.')[1]
  //   // let last_hour_cpu_percentage = 0
  //   //
  //   // Array.each(value, function(val){// [timestamp,percentage]
  //   //   if(val[0]>= last_hour)
  //   //     last_hour_cpu_percentage = val[1]
  //   //
  //   // })
  //   //
  //   // // if(last_minute_cpu_percentage > (last_hour_cpu_percentage + CPU_PERCENTAGE_THRESHOLD))
  //   // //   console.log('last_hour_cpu_percentage', last_hour_cpu_percentage, last_minute_cpu_percentage)
  //   //
  //   // if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_CRIT)
  //   //   console.log('CPU_PERCENTAGE_HOUR_CRIT', last_hour_cpu_percentage)
  //   //
  //   // else if(last_hour_cpu_percentage > CPU_PERCENTAGE_HOUR_WARN)
  //   //   console.log('CPU_PERCENTAGE_HOUR_WARN', last_hour_cpu_percentage)
  //
  //   debug_internals('tabular os.hour.networkInterfaces alert %O %O', value, payload)
  // },

  // 'data[].%hosts.os.hour.procs': (value, payload) => {
  //   console.log('data os.hour.procs alert', value, payload)
  // },

  // 'data[].%hosts.os.hour.procs:uid': (value, payload) => {
  //   console.log('data os.hour.procs alert', value, payload)
  // },
}
