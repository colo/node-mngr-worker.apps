'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Nginx');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Nginx:Internals');

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
        delete entry_point[key]
        entry_point[key] = 0
        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          entry_point[key] += val

        })

        debug('unique_visitors - doc %o', entry_point[key])
        if(Object.getLength(entry_point[key]) === 0)
          delete entry_point[key]

        // process.exit(1)
        return entry_point
      }
    },
    generic: {
      generic: new RegExp('^(status|method|remote_addr|remote_user|pathname|qs|unique\_visitors\_by\_ip)$'),
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        delete entry_point[key]
        entry_point[key] = {}
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
    generic_agent_or_geoip: {
      generic_agent_or_geoip: new RegExp('^(^user\_agent|geoip)$'),
      // key: function(entry_point, timestamp, value, key){
      //   debug_internals('key %s %o', key, value)
      //   process.exit(1)
      // },
      // value: function(entry_point, timestamp, value, key){
      //   debug_internals('value %s %o', key, value)
      //   process.exit(1)
      // },
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        delete entry_point[key]
        entry_point[key] = {}
        let data_values = Object.values(value);
        Array.each(data_values, function(val){
          // debug('method - doc %o', val)
          if(val && Object.getLength(val) > 0){
            Object.each(val, function(data, item){
              if(!entry_point[key][item]) entry_point[key][item] = {}

              Object.each(data, function(val, data_item){

                if(!entry_point[key][item][data_item]) entry_point[key][item][data_item] = {}

                Object.each(val, function(agent, val_item){
                  if(typeof val_item !== 'string')
                    val_item = JSON.stringify(val_item)

                  if(!entry_point[key][item][data_item][val_item]) entry_point[key][item][data_item][val_item] = 0

                  entry_point[key][item][data_item][val_item] += agent
                })



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
    referer: {
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, value, key)
        delete entry_point[key]
        entry_point[key] = {}
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
    // geoip: {
    //   doc: function(entry_point, value, key){
    //     debug_internals('doc %s %o', key, value)
    //     delete entry_point[key]
    //
    //     let stat = {}
    //     let data_values = Object.values(value);
    //
    //     Array.each(data_values, function(data){
    //       // if(!stat[key]) stat[key] = {}
    //       Object.each(data, function(item, name){
    //         // if(name !== 'major' && name !== 'minor'){
    //
    //           if((item.geonameId || (item.names && item.geonameId.en)) && !stat[name]) stat[name] = {}
    //
    //           if(item.geonameId){
    //             if(!stat[name].geonameId) stat[name].geonameId = {}
    //             if(!stat[name].geonameId[item.geonameId]) stat[name].geonameId[item.geonameId] = 0
    //             stat[name].geonameId[item.geonameId] +=1
    //           }
    //
    //           if(item.names && item.names.en ){
    //             if(!stat[name].names) stat[name].names = {}
    //             if(!stat[name].names[item.names.en]) stat[name].names[item.names.en] = 0
    //             stat[name].names[item.names.en] +=1
    //           }
    //           // Object.each(item, function(val, key){
    //           //   if(key !== 'major' && key !== 'minor' && key !== 'patch' && key !== 'patchMinor ' && val !== null){
    //           //     if(!stat[name][key]) stat[name][key] = {}
    //           //     if(!stat[name][key][val]) stat[name][key][val] = 0
    //           //     stat[name][key][val] += 1
    //           //   }
    //           // })
    //         // }
    //
    //
    //
    //       })
    //
    //     })
    //
    //     debug_internals('doc %o', stat)
    //
    //     entry_point[key] = stat
    //     // process.exit(1)
    //     return entry_point
    //
    //   },
    // },

    // body_bytes_sent: {
    //   doc: function(entry_point, value, key){
    //     debug('body_bytes_sent - doc', entry_point, value, key)
    //
    //     let data_values = Object.values(value);
    //
    //     let min = ss.min(data_values);
    //     let max = ss.max(data_values);
    //
    //
    //
    //
    //     entry_point[key] = {
    //       // samples: time,
    //       min : min,
    //       max : max,
    //       mean : ss.mean(data_values),
    //       median : ss.median(data_values),
    //       mode : ss.mode(data_values),
    //       sum: ss.sumSimple(data_values),
    //       range: max - min,
    //     }
    //
    //     // debug('body_bytes_sent - doc', entry_point)
    //     // process.exit(1)
    //     return entry_point
    //   },
    //
    // }
    body_bytes_sent: {
      doc: function(entry_point, value, key){
        debug('body_bytes_sent - doc', entry_point, value, key)

        // let data_values = Object.values(value);
        //
        // let min = ss.min(data_values);
        // let max = ss.max(data_values);




        // entry_point[key] = {
        //   // samples: time,
        //   min : min,
        //   max : max,
        //   mean : ss.mean(data_values),
        //   median : ss.median(data_values),
        //   mode : ss.mode(data_values),
        //   sum: ss.sumSimple(data_values),
        //   range: max - min,
        // }
        entry_point[key] = ss_stat(value)

        // debug('body_bytes_sent - doc', entry_point)
        // process.exit(1)
        return entry_point
      },

    }
  }

}
