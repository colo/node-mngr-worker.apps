module.exports = {
  data: [
    // {
    //   '%hosts': (value, payload) => {
    //     console.log('host alert', value, payload)
    //   }
    // },
    // {
    //   '%hosts': [
    //     {
    //       '%host': (value, payload) => {
    //         console.log('each host alert', value, payload)
    //       }
    //     }
    //   ]
    // },

    // {
    //   '%hosts': {
    //     'os' : {
    //       'loadavg': {
    //         '$payload': {
    //           'buffer': [],
    //           'counter': 0,
    //           '$extra':{
    //             'tabular': [{
    //               '%hosts': {
    //                 'os' : {
    //                   'loadavg': (value, payload) => {
    //                     console.log('$playload loadavg alert', value)
    //                     return { 'value': value, 'property': payload.property }
    //                   }
    //                 }
    //               }
    //             }]
    //           }
    //         },
    //         '$callback': (value, payload) => {
    //           let current_load = value[0].value[0]
    //           let host = payload.property.split('.')[1]
    //
    //           if(host == 'elk'){
    //             payload.counter--
    //           }
    //           else{
    //             payload.counter++
    //           }
    //
    //           payload.buffer.push(current_load)
    //           // Array.each(payload.extra, function(extra){
    //           //   let extra_host = extra.property.split('.')[1]
    //           //
    //           //   if(host == extra_host){
    //           //     let minute_median = extra.value[0].value.median
    //           //
    //           //     // if( current_load + 0.1 > minute_median){
    //           //       console.log('minute.load', host, current_load)
    //           //       console.log('minute.load.median',extra_host, minute_median )
    //           //       console.log('minute.load + 0.1', current_load+ 0.1)
    //           //     // }
    //           //
    //           //   }
    //           // })
    //
    //           // payload.buffer.push()
    //           // console.log('payload.extra[0]', payload.extra[0][0].value)
    //           // console.log('loadavg alert', value, payload)
    //           console.log('loadavg alert', host, payload)
    //         }
    //       }
    //     }
    //   }
    // },

    // {
    //   '%hosts': {
    //     'os' : {
    //       'loadavg': {
    //         '$payload': {
    //           'buffer': [],
    //           'counter': 0,
    //           '$extra':{
    //             'tabular': [{
    //               '%hosts': {
    //                 'os' : {
    //                   'loadavg': (value, payload) => {
    //                     console.log('$playload loadavg alert', value)
    //                     return { 'value': value, 'property': payload.property }
    //                   }
    //                 }
    //               }
    //             }]
    //           }
    //         },
    //         '$callback': (value, payload) => {
    //           payload.counter++
    //           // console.log('payload.extra[0]', payload.extra[0][0].value)
    //           // console.log('loadavg alert', value, payload)
    //           console.log('loadavg alert', payload.property)
    //         }
    //       }
    //     }
    //   }
    // },

    // {
    //   '%hosts': {
    //     '%path': {
    //       '%properties': [{
    //         '%property':
    //           (value, payload) => {
    //             console.log('%property alert', value, payload)
    //           }
    //
    //       }]
    //     }
    //   }
    // },
  ],
  tabular: [
    // {
    //   '%hosts': {
    //     'os' : {
    //       'loadavg': (value, payload) => {
    //         console.log('tabular loadavg alert', value, payload)
    //       }
    //     }
    //   }
    // }
  ]
}
