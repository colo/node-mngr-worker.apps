'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

let remote_addr = {}

module.exports = function(){
  return {

    post_values: function(entry_point, metadata){
      // debug_internals('post_values ---------------------------------------------')
      // debug_internals('post_values ---------------------------------------------')

      //merge msg data
      if(
        entry_point['delivery']
        && entry_point['delivery']['starting']
        && Object.getLength(entry_point['delivery']['starting']) > 0
        && entry_point['delivery']['status']
        && entry_point['messages']
      ){

        Object.each(entry_point['delivery']['starting'], function(data, id){
          let msg_id = data.msg
          if(entry_point['delivery']['status'][id]){
            if(!entry_point['delivery']['finished']) entry_point['delivery']['finished'] = {}

            entry_point['delivery']['finished'][id] = Object.merge(data, entry_point['delivery']['status'][id])

            delete entry_point['delivery']['starting'][id]
            delete entry_point['delivery']['status'][id]

            if(entry_point['messages'][id]){
              entry_point['delivery']['finished'][id] = Object.merge(entry_point['delivery']['finished'][id], entry_point['messages'][id])
            }
          }

        })


      }


      return entry_point
    },
    generic: {
      generic: new RegExp('^.+$'),
      // generic: new RegExp('^((?!^status).)*$'), // on "doc" keys are "status.local | status.remote | delivery | messages"
      key: function(entry_point, timestamp, value, key, metadata){
        if(!entry_point[key]) entry_point[key] = {}

        return entry_point
      },
      value: function(entry_point, timestamp, value, key, metadata){

          if(!entry_point[key]) entry_point[key] = {}

          // if(key === 'delivery'){
          if(metadata.path === 'logs.qmail.send.delivered'){
            // if(!entry_point[key]['finished']) entry_point[key]['finished'] = {}
            // entry_point[key]['finished'] = Object.merge(entry_point[key]['finished'], Object.clone(value['finished']))
            entry_point[key] = Object.merge(entry_point[key], Object.clone(value))

            // debug_internals('key %o', entry_point, timestamp, value, key, metadata)
            //
            // process.exit(1)

            return entry_point
          }
          else if(/^status/.test(key)){

            Object.each(value, function(data, prop){
                if(!entry_point[key][prop]) entry_point[key][prop] = {}
                entry_point[key][prop][timestamp] = data.mean
            })

            // debug_internals('key %o', entry_point, timestamp, value, key, metadata)
            //
            // process.exit(1)
            return entry_point
          }
          else if(/^(from|to|failed)/.test(key)){
            Object.each(value, function(data, prop){

              if(!entry_point[key][prop]) entry_point[key][prop] = {}
              // entry_point[key][prop][timestamp] = data
              Object.each(data, function(_data, _prop){

                if(key === 'failed' && prop === 'domains'){
                  // debug_internals('key %o', data)
                  //
                  // process.exit(1)
                  if(!entry_point[key][prop][_prop]) entry_point[key][prop][_prop] = []
                  entry_point[key][prop][_prop].combine(_data)
                }
                else{
                  if(!entry_point[key][prop][_prop]) entry_point[key][prop][_prop] = 0
                  entry_point[key][prop][_prop] += _data
                }
              })


            })

            return entry_point
          }

          Object.each(value, function(data, prop){
            if(prop !== 'finished'){
              if(!entry_point[key][prop]) entry_point[key][prop] = {}
              // entry_point[key][prop][timestamp] = data
              Object.each(data, function(_data, _prop){
                entry_point[key][prop][_prop] = _data
              })

            }
          })


        return entry_point
      },
      // generic: new RegExp('^((?!^tai64).)*$'),
      doc: function(entry_point, value, key){
        debug('method - doc', key)


        if(key !== 'status.local' && key !== 'status.remote'){
          entry_point[key] = value

        }
        else{
          debug_internals('HOOK DOC KEY %s %o', key, value)
          // process.exit(1)
          if(!entry_point[key]) entry_point[key] = {}

          Object.each(value, function(row, prop){
            entry_point[key][prop] = ss_stat(row)
          })
          // entry_point[key] = ss_stat(value)
        }

        if(key === 'delivery' && entry_point['delivery'] && entry_point['delivery']['finished']) delete entry_point['delivery']['finished']

        return entry_point
      }
    },

  }

}
