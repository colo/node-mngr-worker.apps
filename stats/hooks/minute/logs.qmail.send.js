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
              if(!delivery.finished[id] || delivery_status.status === 'deferral'){//if there wasn't a 'delivery.start' for this id
                if(delivery.finished[id] && delivery_status.status === 'deferral'){
                  delivery_status = Object.merge(delivery.finished[id], delivery_status)
                  delivery.status[id] = delivery_status
                  delivery.status[id].deferral = delivery_status.timestamp
                  delete delivery.finished[id]
                }
                else{
                  delivery.status[id] = delivery_status
                  delivery.status[id].end = delivery_status.timestamp
                }

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
          if(!_delivery.response && !_delivery.status){
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
        //move to another doc
        if(/^status/.test(prop)){
          let new_path = path+'.status'
          if(!entry_point[new_path]) entry_point[new_path] = {}

          entry_point[new_path][prop] = data
        }
        //create another doc but keep current
        else if(/^messages/.test(prop)){
          let new_path = path+'.queue'
          if(!entry_point[new_path]) entry_point[new_path] = {}
          entry_point[new_path][prop] = data

          if(!entry_point[path]) entry_point[path] = {}
          entry_point[path][prop] = data
        }
        //create another doc but keep current
        else if(/^delivery/.test(prop)){
          if(data.finished)
            entry_point[path+'.delivered'] = data.finished

          if(!entry_point[path+'.queue']) entry_point[path+'.queue'] = {}
          if(!entry_point[path+'.queue'].delivery) entry_point[path+'.queue'].delivery = {}

          if(data.starting)
            entry_point[path+'.queue'].delivery.starting = data.starting

          if(data.status)
            entry_point[path+'.queue'].delivery.status = data.status

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

      //duplicate to new kind of docs, used for hour && day stats
      if(path === 'logs.qmail.send'){
        entry_point['logs.qmail.send.stats'] = entry_point['logs.qmail.send']
      }

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
      doc: function(entry_point, value, key, path){
        debug('method - doc', key, path)
        // process.exit(1)
        // key === status (delete tai64)

        let from = {
          domains:{},
          rcpt:{},
        }
        // let to = {
        //   domains:{},
        //   rcpt:{},
        // }
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

        // if(key !== 'status.local' && key !== 'status.remote'){
        if(path === 'logs.qmail.send.stats'){
          // debug('method - doc', key, path, JSON.stringify(value))
          // process.exit(1)

          if(key !== 'delivery' && key !== 'messages'){
            entry_point[key] = value
          }
          else if(key === 'messages'){
            if(!entry_point['messages']) entry_point['messages'] = 0
            entry_point['messages'] += Object.values(value).length
          }




          Object.each(value, function(row, prop){
            Object.each(row, function(data, id){
              if(data.bytes){
                if(!entry_point['bytes']) entry_point['bytes'] = 0
                entry_point['bytes'] += data.bytes
              }

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
                // if(!to.rcpt[data.to]) to.rcpt[data.to] = 0
                // to.rcpt[data.to] += 1
                //
                let domain = (data.to.indexOf('@') > -1) ?  /\@(.*)/.exec(data.to) : []
                // if(domain[1]){
                //   domain[1] = domain[1].replace('>', '')
                //   if(!to.domains[domain[1]]) to.domains[domain[1]] = 0
                //   to.domains[domain[1]] += 1
                // }

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

          // Object.each(to, function(data, prop){
          //   if(Object.getLength(data) === 0)
          //     delete to[prop]
          // })

          // if(Object.getLength(to) > 0)
          //   entry_point['to'] = to

          Object.each(failed, function(data, prop){
            if(Object.getLength(data) === 0)
              delete failed[prop]
          })

          Object.each(success, function(data, prop){
            if(Object.getLength(data) === 0)
              delete success[prop]
          })

          if(!entry_point['to']) entry_point['to'] = {}

          if(Object.getLength(failed) > 0)
            entry_point['to']['failed'] = failed

          if(Object.getLength(success) > 0)
            entry_point['to']['success'] = success

          // if(key === 'delivery'){
          //   delete entry_point['delivery']
          //   // if(entry_point['delivery']['finished']) delete entry_point['delivery']['finished']
          //   // if(entry_point['delivery']['status']) delete entry_point['delivery']['status']
          //   // if(entry_point['delivery']['starting']) delete entry_point['delivery']['starting']
          // }
          // else if(key === 'messages'){
          //   delete entry_point['messages']
          // }
        }
        else if(path === 'logs.qmail.send.status'){
          debug_internals('HOOK DOC KEY %s %o', key, value)
          // process.exit(1)
          if(!entry_point[key]) entry_point[key] = {}

          Object.each(value, function(row, prop){
            entry_point[key][prop] = ss_stat(row)
          })
          // entry_point[key] = ss_stat(value)
        }
        else{
          // debug('method - doc', key, path, JSON.stringify(value))
          // process.exit(1)
          //
          entry_point[key] = value
        }



        return entry_point
      }
    },

  }

}
