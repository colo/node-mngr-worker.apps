'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send:Status');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send:Status:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

let remote_addr = {}

module.exports = function(){
  return {


    generic: {
      generic: new RegExp('^.+$'),
      // generic: new RegExp('^((?!^status).)*$'), // on "doc" keys are "status.local | status.remote | delivery | messages"
      key: function(entry_point, timestamp, value, key, metadata){
        if(!entry_point[key]) entry_point[key] = {}

        return entry_point
      },
      value: function(entry_point, timestamp, value, key, metadata){

        Object.each(value, function(data, prop){
            if(!entry_point[key][prop]) entry_point[key][prop] = {}
            entry_point[key][prop][timestamp] = data.mean
        })

        return entry_point
      },
      // generic: new RegExp('^((?!^tai64).)*$'),
      doc: function(entry_point, value, key, path){
        debug('method - doc', key, path)

        if(!entry_point[key]) entry_point[key] = {}

        Object.each(value, function(row, prop){
          entry_point[key][prop] = ss_stat(row)
        })


        return entry_point
      }
    },

  }

}
