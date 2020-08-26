'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Nginx');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Nginx:Internals');

// let networkInterfaces = {} //temp obj to save data
let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')


module.exports = function(){
  return {

    generic: {
      generic: new RegExp('^(action|cgi|course|type|user)$'),
      doc: function(entry_point, value, key){
        // debug('method - doc', entry_point, value, key)
        // delete entry_point[key]
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
    hits: {
      // value: function(entry_point, timestamp, value, key){
      //   debug('method - doc', entry_point, value, key)
      // },
      doc: function(entry_point, value, key){
        debug('method - doc', entry_point, value, key)
        // if(entry_point[key] && entry_point[key] !== 0)
        //   process.exit(1)
        // delete entry_point[key]
        if(!entry_point[key]) entry_point[key] = 0
        // entry_point[key] = {}
        let data_values = Object.values(value);
        entry_point[key] += ss.sum(data_values)

        return entry_point
      }
    },

  }

}
