'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Qmail:Send');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:Logs:Qmail:Send:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

let remote_addr = {}

module.exports = function(){
  return {
    // delete: {
    //   // delete: new RegExp('^.+$'),
    //   delete: new RegExp('^((?!^status).)*$'),
    //   key: function(entry_point, value, key){
    //     // debug_internals('deleting key %s', key)
    //     if(entry_point && entry_point[key])
    //       delete entry_point[key]
    //     return entry_point
    //   }
    // },
    pre_values: function(entry_point, group){
      debug_internals('pre_values %o', group.metadata)

      let key = group.metadata.domain
      let timestamp = group.metadata.timestamp
      let tai64 = group.data.tai64

      if(key === "status"){//unmodified
        // if(!entry_point[key]) entry_point[key] = []
        // entry_point[key].push(group.data)
      }
      else if(key !== "msg.end" && tai64){
        if(!entry_point[key]) entry_point[key] = {}
        if(!entry_point[key][tai64]) entry_point[key][tai64] = []
        let data = Object.clone(group.data)
        data.timestamp = timestamp
        delete data.tai64
        entry_point[key][tai64].push(data)
      }


      // process.exit(1)
      return entry_point
    },
    post_values: function(entry_point, metadata){
      debug_internals('post_values %s %o', metadata)

      let delivery = {
        starting: {},
        status: {},
        finished: {}
      }

      let messages = {}

      if(entry_point['delivery.starting'] && Object.getLength(entry_point['delivery.starting']) > 0){
        Object.each(entry_point['delivery.starting'], function(data_delivery_starting, tai64_delivery_starting){
          Array.each(data_delivery_starting, function(delivery_starting){
            let id = delivery_starting.id
            delivery.finished[id] = delivery_starting
            delivery.finished[id].delivery = delivery_starting.timestamp
            delete delivery.finished[id].timestamp
          })
        })

        //merge msg data
        if(entry_point['msg.info'] && Object.getLength(entry_point['msg.info']) > 0){
          Object.each(delivery.finished, function(_delivery, id){
            Object.each(entry_point['msg.info'], function(msg_info, taig64_msg_info){
              Array.each(msg_info, function(msg, msg_index){
                if(_delivery.msg === msg.msg){
                  delivery.finished[id] = Object.merge(_delivery, msg)
                  delivery.finished[id].start = msg.timestamp
                  delete delivery.finished[id].timestamp
                }
                else{
                  messages[msg.msg] = Object.clone(msg)
                  messages[msg.msg].start = msg.timestamp
                  delete messages[msg.msg].timestamp
                }
              })
            })

          })
        }

        if(entry_point['msg.bounce'] && Object.getLength(entry_point['msg.bounce']) > 0){
          Object.each(delivery.finished, function(_delivery, id){
            Object.each(entry_point['msg.bounce'], function(msg_info, taig64_msg_info){
              Array.each(msg_info, function(msg, msg_index){
                if(_delivery.msg === msg.msg){
                  delivery.finished[id].bounce = msg.timestamp
                }
              })
            })

          })
        }


        //add status response to 'finished' or 'status'
        if(entry_point['delivery.status'] && Object.getLength(entry_point['delivery.status']) > 0){
          Object.each(entry_point['delivery.status'], function(data_delivery_status, tai64_delivery_status){
            Array.each(data_delivery_status, function(delivery_status){
              let id = delivery_status.id
              if(!delivery.finished[id]){//if there wasn't a 'delivery.start' for this id
                delivery.status[id] = delivery_status
                delivery.status[id].end = delivery_status.timestamp
                delete delivery.status[id].timestamp
              }
              else{
                delivery.finished[id] = Object.merge(delivery.finished[id], delivery_status)
                delivery.finished[id].end = delivery_status.timestamp
                delete delivery.finished[id].timestamp
              }

            })
          })
        }


        // move 'undefined' delivers to 'starting'
        Object.each(delivery.finished, function(_delivery, id){
          if(!delivery.response && !_delivery.status){
            delivery.starting[id] = _delivery
            delete delivery.finished[id]
          }
        })
      }

      Object.each(entry_point, function(point, key){
        // if(/^((?!^status).)*$'/.test(key)) //not status* key
        if(key !== 'status.local' && key !== 'status.remote') //not status* key
          delete entry_point[key]
      })

      Object.each(delivery, function(data, key){
        if(Object.getLength(data) === 0)
          delete delivery[key]
      })

      Object.each(messages, function(data, key){
        if(Object.getLength(data) === 0)
          delete messages[key]
      })

      if(Object.getLength(delivery) > 0)
        entry_point['delivery'] = delivery

      if(Object.getLength(messages) > 0)
        entry_point['messages'] = messages

      // debug_internals('post_values %s', JSON.stringify(entry_point) )


      // process.exit(1)
      return entry_point
    },
    pre_doc: function(entry_point, value, path){
      // debug_internals('pre_doc %o %o %s', entry_point, value, path)
      Object.each(value, function(data, prop){
        if(/^status/.test(prop)){
          let new_path = path+'.status'
          if(!entry_point[new_path]) entry_point[new_path] = {}
          // let status = prop.split('.')[1]
          // entry_point[new_path][status] = data
          entry_point[new_path][prop] = data
        }
        else if(/^delivery/.test(prop)){
          if(data.finished)
            entry_point[path+'.delivered'] = data.finished

            // delete data.finished
          // }
          // else {
          /**
          * don't remove 'finished' as is needed for 'docs', remove there
          **/
          if(!entry_point[path]) entry_point[path] = {}
          entry_point[path][prop] = data
          // }
        }
        else{
          if(!entry_point[path]) entry_point[path] = {}
          entry_point[path][prop] = data
        }

      })
      // debug_internals('pre_doc %o %o %s', JSON.stringify(entry_point), path)
      // process.exit(1)
      return entry_point
    },
    /**
    * per key
    **/
    generic: {
      generic: new RegExp('^.+$'),
      // generic: new RegExp('^((?!^status).)*$'), // on "doc" keys are "status.local | status.remote | delivery | messages"
      key: function(entry_point, timestamp, value, key, metadata){
        debug_internals('key %o', entry_point, timestamp, value, key, metadata)
        // process.exit(1)
        if(metadata.domain === 'status' && key !== 'tai64'){
          if(!entry_point['status.'+key]) entry_point['status.'+key] = {}
          // process.exit(1)
        }

        if(entry_point && entry_point[key]){
          delete entry_point[key]
        }

        return entry_point
      },
      value: function(entry_point, timestamp, value, key, metadata){
        debug_internals('value %o', metadata)

        if(metadata.domain === 'status' && key !== 'tai64'){
          if(!entry_point['status.'+key]) entry_point['status.'+key] = {}
          Object.each(value, function(data, prop){
            if(!entry_point['status.'+key][prop]) entry_point['status.'+key][prop] = {}

            entry_point['status.'+key][prop][timestamp] = data * 1
          })

        }

        // process.exit(1)

        return entry_point
      },
      // generic: new RegExp('^((?!^tai64).)*$'),
      doc: function(entry_point, value, key){
        debug('method - doc', key)
        // key === status (delete tai64)

        let from = {
          domains:{},
          rcpt:{},
        }
        let to = {
          domains:{},
          rcpt:{},
        }
        let failed = {
          domains:{},
          rcpt:{},
        }

        let success = {
          domains:{},
          rcpt:{},
        }
        // let domain_from = {}
        // let domain_to = {}
        //
        // let failed_to = {}

        if(key !== 'status.local' && key !== 'status.remote'){
          entry_point[key] = value

          Object.each(value, function(row, prop){
            Object.each(row, function(data, id){
              if(data.from){
                if(!from.rcpt[data.from]) from.rcpt[data.from] = 0
                from.rcpt[data.from] += 1

                let domain = (data.from.indexOf('@') > -1) ?  /\@(.*)/.exec(data.from) : []
                if(domain[1]){
                  domain[1] = domain[1].replace('>', '')
                  if(!from.domains[domain[1]]) from.domains[domain[1]] = 0
                  from.domains[domain[1]] += 1
                }

              }

              if(data.to){
                if(!to.rcpt[data.to]) to.rcpt[data.to] = 0
                to.rcpt[data.to] += 1

                let domain = (data.to.indexOf('@') > -1) ?  /\@(.*)/.exec(data.to) : []
                if(domain[1]){
                  domain[1] = domain[1].replace('>', '')
                  if(!to.domains[domain[1]]) to.domains[domain[1]] = 0
                  to.domains[domain[1]] += 1
                }

                if(data.status && data.status !== 'success'){
                  if(!failed.rcpt[data.to]) failed.rcpt[data.to] = 0
                  failed.rcpt[data.to] += 1

                  if(domain[1]){//on failed.domains save an array of failed responses
                    if(!failed.domains[domain[1]]) failed.domains[domain[1]] = []
                    failed.domains[domain[1]].push(data.response || data.status)
                  }
                }
                else if (data.status) {
                  if(!success.rcpt[data.to]) success.rcpt[data.to] = 0
                  success.rcpt[data.to] += 1

                  if(!success.domains[domain[1]]) success.domains[domain[1]] = 0
                  success.domains[domain[1]] += 1
                }
              }
            })
          })

          Object.each(from, function(data, prop){
            if(Object.getLength(data) === 0)
              delete from[prop]
          })

          if(Object.getLength(from) > 0)
            entry_point['from'] = from

          Object.each(to, function(data, prop){
            if(Object.getLength(data) === 0)
              delete to[prop]
          })

          if(Object.getLength(to) > 0)
            entry_point['to'] = to

          Object.each(failed, function(data, prop){
            if(Object.getLength(data) === 0)
              delete failed[prop]
          })

          Object.each(success, function(data, prop){
            if(Object.getLength(data) === 0)
              delete success[prop]
          })

          if(Object.getLength(failed) > 0)
            entry_point['failed'] = failed

          if(Object.getLength(success) > 0)
            entry_point['success'] = success
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

        if(key === 'delivery' && entry_point['delivery']['finished']) delete entry_point['delivery']['finished']

        return entry_point
      }
    },

  }

}
