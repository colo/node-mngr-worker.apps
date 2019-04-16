'use strict'

let debug = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:bbb'),
    debug_internals = require('debug')('mngr-ui-admin:apps:hosts:libs:stat:bbb:Internals');

let chart = {
  match: /meetings/,

  watch: {

    value: undefined,

    transform: function(values, caller, chart, cb){
      debug_internals('transform', values)
      let transformed = []
      Array.each(values, function(val, index){
        let transform = {
          value: {
            meetings: 0,
            participants: 0,
            moderators: 0,
            listeners: 0
          },
          timestamp: val.metadata.timestamp
        }
        transform.value.meetings = val.data.length

        Array.each(val.data, function(meeting){
          transform.value.participants += meeting.participantCount
          transform.value.moderators += meeting.moderatorCount
          transform.value.listeners += meeting.listenerCount
        })

        transformed.push(transform)
        if(index == values.length -1)
          cb(transformed)
      })

    }
  }
}

module.exports = function(stat, path){

  if(!chart.match || chart.match.test(path)){
    return chart
  }
  else{
    return undefined
  }
}
