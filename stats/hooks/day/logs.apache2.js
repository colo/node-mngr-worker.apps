'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Day:Logs:Apache2');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Day:Logs:Apache2:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')


module.exports = function(){
  return {
    delete: {
      // delete: new RegExp('^((?!^body\_bytes\_sent|method|pathname|qs|remote_addr|remote_user|status|^referer|^user\_agent|geoip).)*$'),
      delete: new RegExp('^((?!^user\_agent|body\_bytes\_sent|method|status|remote_addr|remote_user|pathname|qs|geoip|^referer|unique\_visitors).)*$'),
      doc: function(entry_point, value, key){
        // debug('doc - ALL', entry_point, value, key)
        if(entry_point && entry_point[key])
          delete entry_point[key]
        // process.exit(1)
        return entry_point
      }
    },
    unique_visitors: {
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        // delete entry_point[key]
        // entry_point[key] = 0
        if(!entry_point[key]) entry_point[key] = 0

        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          entry_point[key] += val

        })

        debug('unique_visitors - doc %o', entry_point[key])
        // if(Object.getLength(entry_point[key]) === 0)
        //   delete entry_point[key]

        // process.exit(1)
        return entry_point
      }
    },
    generic: {
      generic: new RegExp('^(status|method|remote_addr|remote_user|pathname|qs|unique\_visitors\_by\_ip)$'),
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        // delete entry_point[key]
        // entry_point[key] = {}
        if(!entry_point[key]) entry_point[key] = {}

        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          // debug('method - doc %o', val)
          if(val && Object.getLength(val)){
            Object.each(val, function(data, item){
              if(typeof item !== 'string')
                item = JSON.stringify(item)
              if(!entry_point[key][item]) entry_point[key][item] = 0

              entry_point[key][item] += data
            })
          }



        })

        debug('method - doc %o', entry_point[key])
        if(Object.getLength(entry_point[key]) === 0)
          delete entry_point[key]

        return entry_point
      }
    },
    user_agent: {
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        // delete entry_point[key]
        // entry_point[key] = {}
        if(!entry_point[key]) entry_point[key] = {}

        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          // debug('method - doc %o', val)
          if(val && Object.getLength(val) > 0){
            Object.each(val, function(data, item){
              if(!entry_point[key][item]) entry_point[key][item] = {}

              Object.each(data, function(val, data_item){
                if(isNaN(val)){
                  if(!entry_point[key][item][data_item]) entry_point[key][item][data_item] = {}

                  Object.each(val, function(agent, val_item){
                    if(typeof val_item !== 'string')
                      val_item = JSON.stringify(val_item)

                    if(!entry_point[key][item][data_item][val_item]) entry_point[key][item][data_item][val_item] = 0

                    entry_point[key][item][data_item][val_item] += agent
                  })
                }
                else{//Numeric values => os.detailed | device.detailed | etc
                  if(!entry_point[key][item][data_item]) entry_point[key][item][data_item] = 0
                  entry_point[key][item][data_item] += val
                }

              })

            })
          }


        })

        debug('method - doc %o', entry_point[key])
        if(Object.getLength(entry_point[key]) === 0)
          delete entry_point[key]

        // process.exit(1)
        return entry_point
      }
    },
    geoip: {
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, key, value, Object.getLength(value))
        // delete entry_point[key]
        // entry_point[key] = {}

        // delete entry_point[key]
        if(!entry_point[key]) entry_point[key] = {}

        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          // debug('doc %o', val)
          // process.exit(1)
          if(val && Object.getLength(val) > 0){
            Object.each(val, function(data, item){
              // debug('doc item %s - %o', item, data)
              // process.exit(1)

              // if(!entry_point[key][item]) entry_point[key][item] = {}
              //
              // if(data.count){
              //   if(!entry_point[key][item].count) entry_point[key][item] = Object.merge(Object.clone(data), {count: 0})
              //   entry_point[key][item].count += data.count
              // }
              // else{
              //   if(!entry_point[key][item][data]) entry_point[key][item][data] = 0
              //
              //   entry_point[key][item][data] +=1
              // }
              if(!entry_point[key][item]) entry_point[key][item] = {}

              Object.each(data, function(val, data_item){
                // debug('doc data_item %s - %o', data_item, val)
                // process.exit(1)

                if(!entry_point[key][item][data_item]) entry_point[key][item][data_item] = 0

                if(val.ips){
                  if(!entry_point[key][item][data_item].ips) entry_point[key][item][data_item] = Object.merge(Object.clone(val), {ips: []})

                  // entry_point[key][item][data_item].count += val.count
                  entry_point[key][item][data_item].ips.combine(val.ips)
                }
                else{
                  entry_point[key][item][data_item] += val
                }
                // Object.each(val, function(agent, val_item){
                //   if(typeof val_item !== 'string')
                //     val_item = JSON.stringify(val_item)
                //
                //   if(!entry_point[key][item][data_item][val_item]) entry_point[key][item][data_item][val_item] = 0
                //
                //   entry_point[key][item][data_item][val_item] += agent
                // })



              })
              // debug('doc data_item %o', entry_point[key])
              // process.exit(1)

            })
          }


        })

        debug('method - doc %o', entry_point[key])
        // process.exit(1)
        //
        if(Object.getLength(entry_point[key]) === 0)
          delete entry_point[key]

        // process.exit(1)
        return entry_point
      }
    },
    referer: {
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, value, key)
        // delete entry_point[key]
        // entry_point[key] = {}

        if(!entry_point[key]) entry_point[key] = {}


        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          debug('method - doc %o', val)
          // process.exit(1)

          if(val && Object.getLength(val) > 0){
            Object.each(val, function(data, item){
              if(!entry_point[key][item]) entry_point[key][item] = {}

              Object.each(data, function(val, data_item){
                if(typeof data_item !== 'string')
                  data_item = JSON.stringify(data_item)

                if(!entry_point[key][item][data_item]) entry_point[key][item][data_item] = 0

                entry_point[key][item][data_item] += val

              })

            })
          }



        })

        debug('method - doc %o', entry_point[key])
        if(Object.getLength(entry_point[key]) === 0)
          delete entry_point[key]

        return entry_point
      }
    },
    body_bytes_sent: {
      doc: function(entry_point, value, key){
        debug('body_bytes_sent - doc', entry_point, value, key)

        entry_point[key] = ss_stat(value)

        return entry_point
      },

    }
  }

}
