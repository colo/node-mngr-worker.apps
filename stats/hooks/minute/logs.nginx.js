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
      // key: function(entry_point, timestamp, value, key){
      //
      //   if(!entry_point[key]) entry_point[key] = {}
      //   // if(!entry_point[key][timestamp]) entry_point[key][timestamp] = []
      //
      //   // debug_internals('key %s %o %d %o', key, value, timestamp, entry_point)
      //   // process.exit(1)
      //   return entry_point
      // },
      // value: function(entry_point, timestamp, value, key){
      //   // debug_internals('value %s %o %d %o', key, value, timestamp, entry_point)
      //   if(!entry_point[key][timestamp]) entry_point[key][timestamp] = []
      //   entry_point[key][timestamp].push(value)
      //   // debug_internals('value %s %o %d %o', key, value, timestamp, entry_point)
      //   // process.exit(1)
      //   return entry_point
      // },
      // post_values: function(entry_point, timestamp, value, key){
      //   debug_internals('post_values %s %o %d %o', key, value, timestamp, entry_point)
      //   process.exit(1)
      //   return entry_point
      // },
      doc: function(entry_point, value, key){
        // if(key === 'remote_addr'){
        //   debug('method - doc', entry_point, value, key)
        //   process.exit(1)
        // }

        delete entry_point[key]
        entry_point[key] = {}
        Object.each(value, function(data_values, timestamp){
          // let data_values = Object.values(data);

          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(method){
            if(typeof method !== 'string')
              method = JSON.stringify(method)
            if(!entry_point[key][method]) entry_point[key][method] = 0

            entry_point[key][method] +=1
          })


        })

        if(key === 'remote_addr'){
          // debug('method - doc', entry_point, value)
          // process.exit(1)
          remote_addr = value//save it for building "unique_visitors"
        }


        // let data_values = Object.values(value);
        //
        // Array.each(data_values, function(method){
        //   if(typeof method !== 'string')
        //     method = JSON.stringify(method)
        //   if(!entry_point[key][method]) entry_point[key][method] = 0
        //
        //   entry_point[key][method] +=1
        // })
        //
        // if(key === 'remote_addr'){
        //   // debug('method - doc', entry_point, value)
        //   // process.exit(1)
        //   remote_addr = value//save it for building "unique_visitors"
        // }
        // debug('method - doc', entry_point, value, key)
        // process.exit(1)
        return entry_point
      }
    },
    referer: {
      doc: function(entry_point, value, key){
        // debug_internals('doc %s %o', key, value)
        delete entry_point[key]

        let stat = {}
        Object.each(value, function(data_values, timestamp){
          // let data_values = Object.values(row);


          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(data){
            // if(!stat[key]) stat[key] = {}
            if(data !== undefined && data !== null){
              Object.each(data, function(item, name){
                if(name !== 'uri'){
                  if(!stat[name]) stat[name] = {}
                  if(!stat[name][item]) stat[name][item] = 0
                  stat[name][item] +=1
                }
              })
            }



          })
        })
        // let data_values = Object.values(value);
        //
        // Array.each(data_values, function(data){
        //   // if(!stat[key]) stat[key] = {}
        //   Object.each(data, function(item, name){
        //     if(name !== 'uri'){
        //       if(!stat[name]) stat[name] = {}
        //       if(!stat[name][item]) stat[name][item] = 0
        //       stat[name][item] +=1
        //     }
        //   })
        //
        // })

        entry_point[key] = stat

        // debug_internals('doc %s %o', key, stat)
        // process.exit(1)
        return entry_point
      },
    },
    geoip: {
      doc: function(entry_point, value, key){
        // debug_internals('doc %s %o', key, value, Object.getLength(value))
        // if(counter === 1){
        //   process.exit(1)
        // }
        // counter += 1
        //

        // delete entry_point[key]
        if(!entry_point[key] || !entry_point[key].ip) entry_point[key] = {ip: {}, city: {}, country: {}, continent: {}, location: {}, registeredCountry: {}}

        Object.each(value, function(data_values, timestamp){
          // let data_values = Object.values(row);
          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(data){

            let ipAddress
            if(data.traits && data.traits.ipAddress){
              ipAddress = data.traits.ipAddress
            }
            // else {
            //   debug('no ip %o', data)
            //   process.exit(1)
            // }


            if(ipAddress && !entry_point[key].ip[ipAddress]) entry_point[key].ip[ipAddress] = { count: 0 }

            if(entry_point[key].ip[ipAddress]) entry_point[key].ip[ipAddress].count +=1

            if(data.location && entry_point[key].ip[ipAddress]){
              // if(!entry_point[key].ip[ipAddress].location) entry_point[key].ip[ipAddress].location= {}
              // let geo_id = data.location.longitude + ':' + data.location.latitude

              if(!entry_point[key].ip[ipAddress].location) entry_point[key].ip[ipAddress].location = Object.merge(Object.clone(data.location), {city: undefined, country: undefined, continent: undefined})

              // entry_point[key].ip[ipAddress].location.count +=1
              entry_point[key].ip[ipAddress].location.city = (data.city && data.city.names && data.city.names.en) ? data.city.names.en : 'Unknown'
              entry_point[key].ip[ipAddress].location.country = (data.country && data.country.names && data.country.names.en) ? data.country.names.en : 'Unknown'
              entry_point[key].ip[ipAddress].location.continent = (data.continent && data.continent.names && data.continent.names.en) ? data.continent.names.en : 'Unknown'
            }

            Object.each(data, function(item, name){


              if(entry_point[key].ip[ipAddress]){

                // if((item.geonameId || (item.names && item.geonameId.en)) && !entry_point[key].ip[ipAddress][name]) entry_point[key].ip[ipAddress][name] = {}
                // if((item.geonameId) && !entry_point[key].ip[ipAddress][name]) entry_point[key].ip[ipAddress][name] = {}

                if(item.geonameId){
                  // if(!entry_point[key].ip[ipAddress][name].geonameId) entry_point[key].ip[ipAddress][name].geonameId = {}
                  // if(!entry_point[key].ip[ipAddress][name].geonameId[item.geonameId]) entry_point[key].ip[ipAddress][name].geonameId[item.geonameId] = 0
                  // entry_point[key].ip[ipAddress][name].geonameId[item.geonameId] +=1

                  if(!entry_point[key].ip[ipAddress][name]) entry_point[key].ip[ipAddress][name] = {geonameId : item.geonameId, name: undefined}

                  // entry_point[key].ip[ipAddress][name][item.geonameId].count +=1

                  if(item.names && item.names.en && entry_point[key].ip[ipAddress][name].name === undefined){
                    entry_point[key].ip[ipAddress][name].name = item.names.en
                  }
                }

                // if(item.names && item.names.en ){
                //   if(!entry_point[key].ip[ipAddress][name].names) entry_point[key].ip[ipAddress][name].names = {}
                //   if(!entry_point[key].ip[ipAddress][name].names[item.names.en]) entry_point[key].ip[ipAddress][name].names[item.names.en] = 0
                //   entry_point[key].ip[ipAddress][name].names[item.names.en] +=1
                // }

              }


            })


          })
        })





        Object.each(entry_point[key], function(val, prop){
          if(prop !== 'ip' || prop !== 'location'){
            Object.each(entry_point[key].ip, function(ip_val, ip){
              if(ip_val[prop] && ip_val[prop].name && entry_point[key][prop])
                entry_point[key][prop][ip_val[prop].name] = (entry_point[key][prop][ip_val[prop].name]) ? entry_point[key][prop][ip_val[prop].name] + ip_val.count : ip_val.count

            })
          }

          if(prop === 'location'){
            Object.each(entry_point[key].ip, function(ip_val, ip){
              // debug('IP VAL', ip_val)
              // process.exit(1)

              if(ip_val['location'] && ip_val['location'].latitude && ip_val['location'].longitude && entry_point[key]['location']){
                let geoip_id = ip_val['location'].latitude +':'+ ip_val['location'].longitude
                // if(!entry_point[key]['location'][geoip_id]) entry_point[key]['location'][geoip_id] = Object.merge(Object.clone(ip_val.location), {count: 0})
                if(!entry_point[key]['location'][geoip_id]) entry_point[key]['location'][geoip_id] = Object.merge(Object.clone(ip_val.location), {ips: [], count: 0})

                entry_point[key]['location'][geoip_id].count += ip_val.count
                entry_point[key]['location'][geoip_id].ips.push(ip)
              }

            })
          }

        })

        delete entry_point[key].ip

        // debug_internals('doc %o', entry_point[key], Object.getLength(entry_point[key].location))
        // process.exit(1)
        // entry_point[key] = stat
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
        // debug_internals('doc %s %o', key, value)
        delete entry_point[key]

        let stat = {}
        Object.each(value, function(data_values, timestamp){
          // let data_values = Object.values(row);
          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(data){
            // if(!stat[key]) stat[key] = {}
            if(data !== undefined && data !== null){
              Object.each(data, function(item, name){
                // if(name !== 'major' && name !== 'minor'){
                  if(!stat[name]) stat[name] = {}
                  if(item !== undefined && item !== null){

                    Object.each(item, function(val, key){
                      if(val === null || val === '' || item[key] === undefined){
                        delete item[key]
                      }
                    })
                    /**
                    * simple stats
                    **/
                    Object.each(item, function(val, key){
                      if(key !== 'major' && key !== 'minor' && key !== 'patch' && key !== 'patchMinor' && val !== null){
                        if(!stat[name][key]) stat[name][key] = {}
                        if(!stat[name][key][val]) stat[name][key][val] = 0
                        stat[name][key][val] += 1
                      }
                    })
                    /**
                    * detail stats (os | engine | ua)
                    **/
                    if(name === 'os' || name === 'engine' || name === 'ua'){
                      let val = undefined
                      if(item.family){
                        val = item.family
                        if(item.major){
                          val += ' '+item.major
                          if(item.minor){
                            val += '.'+item.minor
                            if(item.patch){
                              val += '.'+item.patch

                              if(item.patchMinor){
                                val += '.'+item.patchMinor
                              }
                            }
                          }
                        }
                      }

                      if(val !== undefined){
                        if(!stat[name+'.detailed']) stat[name+'.detailed'] = {}
                        if(!stat[name+'.detailed'][val]) stat[name+'.detailed'][val] = 0
                        stat[name+'.detailed'][val] += 1
                      }
                    }

                    /**
                    * detail stats (device)
                    **/
                    if(name === 'device'){
                      let val = ''
                      if(item.brand){
                        val = item.brand+' '
                      }

                      if(item.family && item.family !== item.brand+" "+item.model){
                        val += item.family+' '
                      }

                      if(item.model && item.model !== item.family){
                        val += item.model+' '
                      }

                      if(item.type){
                        val += item.type+' '
                      }

                      val = val.trim()

                      if(val !== undefined){
                        if(!stat[name+'.detailed']) stat[name+'.detailed'] = {}
                        if(!stat[name+'.detailed'][val]) stat[name+'.detailed'][val] = 0
                        stat[name+'.detailed'][val] += 1
                      }
                    }

                  }

                // }



              })
            }


          })
        })


        entry_point[key] = stat

        let unique_visitors_ip_uas = {}
        Object.each(remote_addr, function(ips, ts){
          if(!Array.isArray(ips)) ips = [ips]

          Array.each(ips, function(ip){
            if(!unique_visitors_ip_uas[ip]) unique_visitors_ip_uas[ip] = []
            let uas = value[ts]
            if(!Array.isArray(uas))
              uas = [uas]

            Array.each(uas, function(ua){
              unique_visitors_ip_uas[ip].combine([JSON.stringify(ua)])//save ua for this IP
            })

          })
        })

        let unique_visitors = 0
        let unique_visitors_by_ip = {}
        Object.each(unique_visitors_ip_uas, function(uas, ip){
          // debug('user_agent|remote_addr %s %o', ip, uas)
          // Array.each(uas, function(ua){
          //   debug('user_agent|remote_addr %s ', ua)
          // })
          unique_visitors += uas.length
          unique_visitors_by_ip[ip] = uas.length
        })

        // debug('user_agent|remote_addr %o %o %o', unique_visitors_ip_uas, unique_visitors_by_ip, unique_visitors, entry_point[key])
        // process.exit(1)

        entry_point['unique_visitors'] = unique_visitors
        entry_point['unique_visitors_by_ip'] = unique_visitors_by_ip
        return entry_point
      }
    },
    // body_bytes_sent: {
    //   doc: function(entry_point, value, key){
    //     // debug('body_bytes_sent - doc', entry_point, value, key)
    //     // process.exit(1)
    //
    //     let arr = []
    //     Object.each(value, function(row, timestamp){
    //       arr.combine(row)
    //     })
    //     entry_point[key] = ss_stat(arr)
    //     // entry_point[key] = ss_stat(value)
    //
    //     // debug('body_bytes_sent - doc', entry_point)
    //     // process.exit(1)
    //     return entry_point
    //   },
    //
    // }
  }

}
