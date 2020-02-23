'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Nginx');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Nginx:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

let remote_addr = {}

module.exports = function(){
  return {
    delete: {
      // all: new RegExp('^.+$'),
      delete: new RegExp('^((?!^user\_agent|body\_bytes\_sent|method|status|remote_addr|remote_user|pathname|qs|geoip|^referer).)*$'),
      doc: function(entry_point, value, key){
        // debug('doc - ALL', entry_point, value, key)
        if(entry_point && entry_point[key])
          delete entry_point[key]
        // process.exit(1)
        return entry_point
      }
    },
    generic: {
      generic: new RegExp('^(status|method|remote_addr|remote_user|pathname|qs)$'),
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, value, key)
        delete entry_point[key]
        entry_point[key] = {}
        let data_values = Object.values(value);
        Array.each(data_values, function(method){
          if(typeof method !== 'string')
            method = JSON.stringify(method)
          if(!entry_point[key][method]) entry_point[key][method] = 0

          entry_point[key][method] +=1
        })

        if(key === 'remote_addr'){
          // debug('method - doc', entry_point, value)
          // process.exit(1)
          remote_addr = value//save it for building "unique_visitors"
        }
        return entry_point
      }
    },
    referer: {
      doc: function(entry_point, value, key){
        debug_internals('doc %s %o', key, value)
        delete entry_point[key]

        let stat = {}
        let data_values = Object.values(value);

        Array.each(data_values, function(data){
          // if(!stat[key]) stat[key] = {}
          Object.each(data, function(item, name){
            if(name !== 'uri'){
              if(!stat[name]) stat[name] = {}
              if(!stat[name][item]) stat[name][item] = 0
              stat[name][item] +=1
            }
          })

        })

        entry_point[key] = stat

        debug_internals('doc %s %o', key, stat)

        // process.exit(1)
        return entry_point
      },
    },
    geoip: {
      doc: function(entry_point, value, key){
        debug_internals('doc %s %o', key, value)
        delete entry_point[key]

        let stat = {}
        let data_values = Object.values(value);

        Array.each(data_values, function(data){
          // if(!stat[key]) stat[key] = {}
          Object.each(data, function(item, name){
            // if(name !== 'major' && name !== 'minor'){

              if((item.geonameId || (item.names && item.geonameId.en)) && !stat[name]) stat[name] = {}

              if(item.geonameId){
                if(!stat[name].geonameId) stat[name].geonameId = {}
                if(!stat[name].geonameId[item.geonameId]) stat[name].geonameId[item.geonameId] = 0
                stat[name].geonameId[item.geonameId] +=1
              }

              if(item.names && item.names.en ){
                if(!stat[name].names) stat[name].names = {}
                if(!stat[name].names[item.names.en]) stat[name].names[item.names.en] = 0
                stat[name].names[item.names.en] +=1
              }
              // Object.each(item, function(val, key){
              //   if(key !== 'major' && key !== 'minor' && key !== 'patch' && key !== 'patchMinor ' && val !== null){
              //     if(!stat[name][key]) stat[name][key] = {}
              //     if(!stat[name][key][val]) stat[name][key][val] = 0
              //     stat[name][key][val] += 1
              //   }
              // })
            // }



          })

        })

        debug_internals('doc %o', stat)

        entry_point[key] = stat
        // process.exit(1)
        return entry_point

      },
    },
    user_agent: {
      // key: function(entry_point, timestamp, value, key){
      //   debug_internals('key %s %o', key, value)
      //   process.exit(1)
      // },
      // value: function(entry_point, timestamp, value, key){
      //   debug_internals('value %s %o', key, value)
      //   process.exit(1)
      // },
      doc: function(entry_point, value, key){
        debug_internals('doc %s %o', key, value)
        delete entry_point[key]

        let stat = {}
        let data_values = Object.values(value);

        Array.each(data_values, function(data){
          // if(!stat[key]) stat[key] = {}
          Object.each(data, function(item, name){
            // if(name !== 'major' && name !== 'minor'){
              if(!stat[name]) stat[name] = {}
              Object.each(item, function(val, key){
                if(key !== 'major' && key !== 'minor' && key !== 'patch' && key !== 'patchMinor' && val !== null){
                  if(!stat[name][key]) stat[name][key] = {}
                  if(!stat[name][key][val]) stat[name][key][val] = 0
                  stat[name][key][val] += 1
                }
              })
            // }



          })

        })

        entry_point[key] = stat

        let unique_visitors_ip_uas = {}
        Object.each(remote_addr, function(ip, ts){
          if(!unique_visitors_ip_uas[ip]) unique_visitors_ip_uas[ip] = []

          unique_visitors_ip_uas[ip].combine([JSON.stringify(value[ts])])//save ua for this IP


        })
        let unique_visitors = 0
        let unique_visitors_by_ip = {}
        Object.each(unique_visitors_ip_uas, function(uas, ip){
          debug('user_agent|remote_addr %s %o', ip, uas)
          // Array.each(uas, function(ua){
          //   debug('user_agent|remote_addr %s ', ua)
          // })
          unique_visitors += uas.length
          unique_visitors_by_ip[ip] = uas.length
        })

        debug('user_agent|remote_addr %o %o %o', unique_visitors_ip_uas, unique_visitors)
        // process.exit(1)
        entry_point['unique_visitors'] = unique_visitors
        entry_point['unique_visitors_by_ip'] = unique_visitors_by_ip
        return entry_point
      }
    },
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
