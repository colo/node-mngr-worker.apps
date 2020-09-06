'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:Logs:Qmail:Send:Internals');

// let networkInterfaces = {} //temp obj to save data
// let ss = require('simple-statistics')
const ss_stat = require('../../libs/stat')

let remote_addr = {}

module.exports = function(){
  return {
    pre_doc: function(entry_point, value, path){
      // debug_internals('pre_doc %o %o %s', entry_point, JSON.stringify(value), path)
      // process.exit(1)

      Object.each(value, function(data, prop){
        if(/^messages/.test(prop)){
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
    generic: {
      generic: new RegExp('^.+$'),
      // generic: new RegExp('^((?!^status).)*$'), // on "doc" keys are "status.local | status.remote | delivery | messages"
      key: function(entry_point, timestamp, value, key, metadata){
        if(!entry_point[key]) entry_point[key] = {}

        return entry_point
      },
      value: function(entry_point, timestamp, value, key, metadata){

        if(!entry_point[key]) entry_point[key] = {}

        Object.each(value, function(data, prop){

          if(!entry_point[key][prop]) entry_point[key][prop] = {}

          entry_point[key][prop] = Object.merge(entry_point[key][prop], data)

        })


        return entry_point
      },
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


          // entry_point[key] = value
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
      // doc: function(entry_point, value, key, path){
      //   debug('method - doc', key, path)
      //   // process.exit(1)
      //
      //
      //   debug_internals('HOOK DOC KEY %s %o', key, value)
      //   process.exit(1)
      //
      //   entry_point[key] = value
      //
      //
      //
      //   if(key === 'delivery' && entry_point['delivery'] && entry_point['delivery']['finished']){
      //     let from = {
      //       domains:{},
      //       rcpt:{},
      //     }
      //     let to = {
      //       domains:{},
      //       rcpt:{},
      //     }
      //     let failed = {
      //       domains:{},
      //       rcpt:{},
      //     }
      //
      //     let success = {
      //       domains:{},
      //       rcpt:{},
      //     }
      //
      //     Object.each(entry_point['delivery']['finished'], function(data, id){
      //       if(data.from){
      //         if(!from.rcpt[data.from]) from.rcpt[data.from] = 0
      //         from.rcpt[data.from] += 1
      //
      //         let domain = (data.from.indexOf('@') > -1) ?  /\@(.*)/.exec(data.from) : []
      //         if(domain[1]){
      //           domain[1] = domain[1].replace('>', '')
      //           if(!from.domains[domain[1]]) from.domains[domain[1]] = 0
      //           from.domains[domain[1]] += 1
      //         }
      //
      //       }
      //
      //       if(data.to){
      //         if(!to.rcpt[data.to]) to.rcpt[data.to] = 0
      //         to.rcpt[data.to] += 1
      //
      //         let domain = (data.to.indexOf('@') > -1) ?  /\@(.*)/.exec(data.to) : []
      //         if(domain[1]){
      //           domain[1] = domain[1].replace('>', '')
      //           if(!to.domains[domain[1]]) to.domains[domain[1]] = 0
      //           to.domains[domain[1]] += 1
      //         }
      //
      //         if(data.status && data.status !== 'success'){
      //           if(!failed.rcpt[data.to]) failed.rcpt[data.to] = 0
      //           failed.rcpt[data.to] += 1
      //
      //           if(domain[1]){//on failed.domains save an array of failed responses
      //             if(!failed.domains[domain[1]]) failed.domains[domain[1]] = []
      //             failed.domains[domain[1]].push(data.response || data.status)
      //           }
      //         }
      //         else if (data.status) {
      //           if(!success.rcpt[data.to]) success.rcpt[data.to] = 0
      //           success.rcpt[data.to] += 1
      //
      //           if(!success.domains[domain[1]]) success.domains[domain[1]] = 0
      //           success.domains[domain[1]] += 1
      //         }
      //       }
      //     })
      //
      //     Object.each(from, function(data, prop){
      //       if(Object.getLength(data) === 0)
      //         delete from[prop]
      //     })
      //
      //     if(Object.getLength(from) > 0)
      //       entry_point['from'] = (entry_point['from']) ? Object.merge(entry_point['from'],from) : from
      //
      //     Object.each(to, function(data, prop){
      //       if(Object.getLength(data) === 0)
      //         delete to[prop]
      //     })
      //
      //     if(Object.getLength(to) > 0)
      //       entry_point['to'] = (entry_point['to']) ? Object.merge(entry_point['to'],to) : to
      //
      //     Object.each(failed, function(data, prop){
      //       if(Object.getLength(data) === 0)
      //         delete failed[prop]
      //     })
      //
      //     Object.each(success, function(data, prop){
      //       if(Object.getLength(data) === 0)
      //         delete success[prop]
      //     })
      //
      //     if(Object.getLength(failed) > 0)
      //       entry_point['failed'] = (entry_point['failed']) ? Object.merge(entry_point['failed'],failed) : failed
      //
      //     if(Object.getLength(success) > 0)
      //       entry_point['success'] = (entry_point['success']) ? Object.merge(entry_point['success'],success) : success
      //
      //     // debug('method - doc', success, failed, to, from)
      //     // process.exit(1)
      //
      //     delete entry_point['delivery']['finished']
      //   }
      //
      //
      //   return entry_point
      // }
    },

  }

}
