module.exports = {


  'data[].%hosts': (value, payload) => {
    console.log('host alert', value, payload)
  },

  'data[].%hosts[].%host': (value, payload) => {
    console.log('each host alert', value, payload)
  },

  // 'data[].%hosts.os.loadavg': {
  //   '$payload': {
  //     'tabular[].%hosts.os.loadavg': (value, payload) => {
  //       console.log('$playload loadavg alert', value)
  //       return { 'value': value, 'property': payload.property }
  //     }
  //   },
  //   '$callback': (value, payload) => {
  //     console.log('loadavg alert', value, payload, payload.extra)
  //   }
  // },


  'data[].%hosts.%path.%properties[].%property': (value, payload) => {
    console.log('%property alert', value, payload)
  },

  'tabular[].%hosts.os.loadavg': (value, payload) => {
    console.log('tabular loadavg alert', value, payload)
  }

}
