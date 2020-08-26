'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Educativa');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Educativa:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

// let remote_addr = {}
const NANOSECOND = 1000 * 1000
module.exports = function(){
  return {
    delete: {
      // all: new RegExp('^.+$'),
      delete: new RegExp('^((?!^action|cgi|course|duration|type|user).)*$'),
      doc: function(entry_point, value, key){
        // debug('doc - ALL', entry_point, value, key)
        if(entry_point && entry_point[key])
          delete entry_point[key]
        // process.exit(1)
        return entry_point
      }
    },
    generic: {
      generic: new RegExp('^(action|cgi|course|type|user)$'),
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, value, key)
        delete entry_point[key]
        entry_point[key] = {}

        Object.each(value, function(data_values, timestamp){
          // let data_values = Object.values(row);
          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(method){
            if(typeof method !== 'string')
              method = JSON.stringify(method)

            if(method === '')
              method = 'undefined'

            if(!entry_point[key][method]) entry_point[key][method] = 0

            entry_point[key][method] +=1


          })
        })

        // let data_values = Object.values(value);
        // Array.each(data_values, function(method){
        //   if(typeof method !== 'string')
        //     method = JSON.stringify(method)
        //
        //   if(method === '')
        //     method = 'undefined'
        //
        //   if(!entry_point[key][method]) entry_point[key][method] = 0
        //
        //   entry_point[key][method] +=1
        //
        //
        // })

        if(key === 'cgi' && entry_point['cgi']){
          if(!entry_point['hits']) entry_point['hits'] = 0
          Object.each(entry_point['cgi'], function(val, cgi){
            entry_point['hits'] += val
          })


        }

        // debug('method - doc', entry_point, value)
        // process.exit(1)


        return entry_point
      }
    },

    duration: {
      doc: function(entry_point, value, key){
        debug_internals('doc %s %o', key, value)
        // process.exit(1)

        delete entry_point[key]

        // let stat = {}
        // let data_values = Object.values(value);
        let arr = []
        Object.each(value, function(data_values, timestamp){
          if(!Array.isArray(data_values))
            data_values = [data_values]

          Array.each(data_values, function(duration){
            duration = (duration / NANOSECOND).toFixed(1) * 1
            arr.push(duration)
          })
          // Object.each(row, function(data, key){
          //   row[key] = (data / NANOSECOND).toFixed(1) * 1
          // })
          // arr.combine(row)
        })

        entry_point[key] = ss_stat(arr)

        // Object.each(value, function(val, key){
        //   value[key] = (val / NANOSECOND).toFixed(1) * 1
        // })

        // entry_point[key] = ss_stat(value)

        // debug_internals('doc %s %o', key, entry_point[key])
        // process.exit(1)

        return entry_point
      },
    },

  }

}
