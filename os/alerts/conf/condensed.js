module.exports = {


  'data[].%hosts': (value, payload) => {
    console.log('host alert', value, payload)
  },

  'data[].%hosts[].%host': (value, payload) => {
    console.log('each host alert', value, payload)
  },

  'data[].%hosts.os.loadavg': {
    '$payload': {
      'buffer': [],
      'counter': 0,
      '$extra':{
        'tabular[].%hosts.os.loadavg': (value, payload) => {
          console.log('$playload loadavg alert', value)
          return { 'value': value, 'property': payload.property }
        }
      }
    },
    '$callback': (value, payload) => {
      payload.counter++
      console.log('payload.extra[0]', payload.extra[0][0].value)
      console.log('loadavg alert', value, payload)
    }
  },


  'data[].%hosts.%path.%properties[].%property': (value, payload) => {
    console.log('%property alert', value, payload)
  },

  'tabular[].%hosts.os.loadavg': (value, payload) => {
    console.log('tabular loadavg alert', value, payload)
  }

}
