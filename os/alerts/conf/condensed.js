module.exports = {


  // 'data[].%hosts': (value, payload) => {
  //   console.log('host alert', value, payload)
  // },
  //
  // 'data[].%hosts[].%host': (value, payload) => {
  //   console.log('each host alert', value, payload)
  // },


  // 'data[].%hosts.os.loadavg': {
  //   '$payload': {
  //     'buffer': [],
  //     'counter': 0,
  //     '$extra': [
  //       // 'tabular[].%hosts.os.loadavg': (value, payload) => { // [] -> bad
  //       {
  //         'tabular.%hosts.os.loadavg': (value, payload) => {
  //           // console.log('$playload loadavg alert', payload)
  //           return { 'value': 1, 'property': payload.property }
  //         }
  //       },
  //       {
  //         'data.%hosts.os/minute.loadavg': (value, payload) => {
  //           // console.log('$playload loadavg alert', payload)
  //           return { 'value': 2, 'property': payload.property }
  //         }
  //       }
  //     ],
  //
  //
  //   },
  //   '$callback': (value, payload) => {
  //     // let current_load = value[0].value[0]
  //     let host = payload.property.split('.')[1]
  //     //
  //     //
  //     // // if(payload.buffer.length == 0 || current_load > payload.buffer[payload.buffer.length - 1]){//bigger than last
  //     // //   payload.buffer.push(current_load)
  //     // //
  //     // //   if(payload.buffer.length > 60){//been incrementing loadavg for the last minute, notify
  //     // //     console.log('NOTIFY', payload.buffer.length, current_load)
  //     // //
  //     // //     //leave only last item so we don't notify on each iteration, only each 60 secs
  //     // //
  //     // //     payload.buffer = [payload.buffer[payload.buffer.length - 1]]
  //     // //   }
  //     // // }
  //     // // else{
  //     // //   payload.buffer = []
  //     // // }
  //     //
  //     // Array.each(payload.extra, function(extra){
  //     //   let extra_host = extra.property.split('.')[1]
  //     //
  //     //   if(host == extra_host){
  //     //     let minute_median = extra.value[0].value.median
  //     //
  //     //     if( current_load > minute_median + 0.1){
  //     //       console.log('minute.load', host, current_load)
  //     //       console.log('minute.load.median',extra_host, minute_median )
  //     //       console.log('minute.load + 0.1', minute_median+ 0.1)
  //     //     }
  //     //
  //     //   }
  //     // })
  //     //
  //     // // payload.buffer.push()
  //     // // console.log('payload.extra[0]', payload.extra[0][0].value)
  //     // // console.log('loadavg alert', value, payload)
  //     // console.log('loadavg alert', host, payload)
  //     payload.next({host:host})
  //   }
  // },


  // 'data[].%hosts.%path.%properties[].%property': (value, payload) => {
  //   console.log('%property alert', value, payload)
  // },
  //

/**
*
**/
  //
  // 'data[].%hosts.os.loadavg': (value, payload) => {
  //   console.log('data os.loadavg alert', value, payload)
  // },
  // 'tabular[].%hosts.os.loadavg': (value, payload) => {
  //   console.log('tabular os.loadavg alert', value, payload)
  // },
  //
  // 'data[].%hosts.os.uptime': (value, payload) => {
  //   console.log('data os.uptime alert', value, payload)
  // },
  // 'tabular[].%hosts.os.uptime': (value, payload) => {
  //   console.log('tabular os.uptime alert', value, payload)
  // },
  //
  // 'data[].%hosts.os.freemem':{
  //   '$payload': {
  //       '$extra':
  //       // [
  //         {
  //           'data.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload loadavg alert', payload)
  //             return { 'value': value, 'property': payload.property }
  //           }
  //         },
  //         // {
  //         //   'data.%hosts.os/minute.loadavg': (value, payload) => {
  //         //     // console.log('$playload loadavg alert', payload)
  //         //     return { 'value': 2, 'property': payload.property }
  //         //   }
  //         // }
  //       // ],
  //   },
  //   '$callback': (value, payload) => {
  //     // let totlamem = payload.extra[0].value[]
  //
  //     console.log('data os.freemem alert', value, payload.extra)
  //   },
  // },
  //
  // 'tabular[].%hosts.os.freemem':{
  //   '$payload': {
  //       '$extra':
  //       // [
  //         {
  //           'tabular.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload loadavg alert', payload)
  //             return { 'value': value, 'property': payload.property }
  //           }
  //         },
  //         // {
  //         //   'data.%hosts.os/minute.loadavg': (value, payload) => {
  //         //     // console.log('$playload loadavg alert', payload)
  //         //     return { 'value': 2, 'property': payload.property }
  //         //   }
  //         // }
  //       // ],
  //   },
  //   '$callback': (value, payload) => {
  //     // let totlamem = payload.extra[0].value
  //
  //     console.log('tabular os.freemem alert', value, payload)
  //   },
  // },
  //
  // 'data[].%hosts.os.cpus': (value, payload) => {
  //   console.log('data os.cpus alert', value, payload)
  // },
  // 'tabular[].%hosts.os.cpus_percentage': (value, payload) => {
  //   console.log('tabular os.cpus_percentage alert', value, payload)
  // },

  // 'data[].%hosts.os.blockdevices': (value, payload) => {
  //   console.log('data os.blockdevices alert', value, payload)
  // },
  //
  // 'tabular[].%hosts.os.blockdevices': (value, payload) => {
  //   console.log('tabular os.blockdevices_stats alert', value, payload)
  // },

  // 'data[].%hosts.os.mounts': (value, payload) => {
  //   console.log('data os.mounts alert', value[4][0].value, payload)
  // },
  //
  // 'tabular[].%hosts.os.mounts': (value, payload) => {
  //   console.log('tabular os.mounts alert', value, payload)
  // },

  'data[].%hosts.os.networkInterfaces': (value, payload) => {
    console.log('data os.networkInterfaces alert', value[0].value.lo, payload)
  },

  'tabular[].%hosts.os.networkInterfaces': (value, payload) => {
    // if(value.enp2s0)
    console.log('tabular os.networkInterfaces alert', value.lo, payload)
  },

/**
* @minute
**/
  //
  // 'data[].%hosts.os.minute.loadavg': (value, payload) => {
  //   console.log('data os.minute.loadavg alert', value, payload)
  // },
  //
  // 'tabular[].%hosts.os.minute.loadavg': (value, payload) => {
  //   console.log('tabular os.minute.loadavg alert', value, payload)
  // },
  //
  // 'data[].%hosts.os.minute.uptime': (value, payload) => {
  //   console.log('data os.minute.uptime alert', value, payload)
  // },
  //
  // 'tabular[].%hosts.os.minute.uptime': (value, payload) => {
  //   console.log('tabular os.minute.uptime alert', value, payload)
  // },
  //
  // 'data[].%hosts.os.minute.freemem':{
  //   '$payload': {
  //       '$extra':
  //       // [
  //         {
  //           'tabular.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload loadavg alert', payload)
  //             return { 'value': value, 'property': payload.property }
  //           }
  //         },
  //         // {
  //         //   'data.%hosts.os/minute.loadavg': (value, payload) => {
  //         //     // console.log('$playload loadavg alert', payload)
  //         //     return { 'value': 2, 'property': payload.property }
  //         //   }
  //         // }
  //       // ],
  //   },
  //   '$callback': (value, payload) => {
  //     let totlamem = payload.extra[0].value
  //
  //     console.log('data os.minute.freemem alert', value, payload)
  //   },
  // },
  //
  // 'tabular[].%hosts.os.minute.freemem':{
  //   '$payload': {
  //       '$extra':
  //       // [
  //         {
  //           'tabular.%hosts.os.totalmem': (value, payload) => {
  //             // console.log('$playload loadavg alert', payload)
  //             return { 'value': value, 'property': payload.property }
  //           }
  //         },
  //         // {
  //         //   'data.%hosts.os/minute.loadavg': (value, payload) => {
  //         //     // console.log('$playload loadavg alert', payload)
  //         //     return { 'value': 2, 'property': payload.property }
  //         //   }
  //         // }
  //       // ],
  //   },
  //   '$callback': (value, payload) => {
  //     let totlamem = payload.extra[0].value
  //
  //     console.log('tabular os.minute.freemem alert', value, payload)
  //   },
  // },
  //
  // 'data[].%hosts.os.minute.cpus': (value, payload) => {
  //   console.log('data os.minute.cpus alert', value, payload)
  // },
  //
  // 'tabular[].%hosts.os.minute.cpus_percentage': (value, payload) => {
  //   console.log('tabular os.minute.cpus_percentage alert', value, payload)
  // },
  //


}
