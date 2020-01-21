'use strict'

let debug = require('debug')('Server:Apps:Notify:Alerts:Pipeline');
let debug_internals = require('debug')('Server:Apps:Notify:Alerts:Pipeline:Internals');

const path = require('path'),
      os= require('os');

let cron = require('node-cron');


const InputPollerRethinkDB = require ( './input/rethinkdb.js' )

// const request = require('request')


let moment = require('moment')


const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const roundSeconds = function(timestamp){
  timestamp = roundMilliseconds(timestamp)
  let d = new Date(timestamp)
  d.setSeconds(0)

  return d.getTime()
}

const roundMinutes = function(timestamp){
  timestamp = roundSeconds(timestamp)
  let d = new Date(timestamp)
  d.setMinutes(0)

  return d.getTime()
}
const roundHours = function(timestamp){
  timestamp = roundMinutes(timestamp)
  let d = new Date(timestamp)
  d.setHours(0)

  return d.getTime()
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
// const DAY = HOUR * 24
const DAY = 15 * MINUTE //devel

const async = require('async')

module.exports = function(payload){
  let {input, output, filters, type, avoid_notify} = payload

  Array.each(filters, function(filter, i){
    filters[i] = filter(payload)
  })

  // let filter_from_default_query_get_lasts = require('../filters/00_from_default_query_get_lasts')(input.table)
  // let filter_from_lasts_get_historical_ranges = require('../filters/01_from_lasts_get_historical_ranges')(input.table)
  // let filter_from_ranges_create_stats = require('../filters/02_from_ranges_create_stats')(input.table)

  let conf = {
    input: [
    	{
    		poll: {

    			id: "input.alerts",
    			conn: [
            Object.merge(
              Object.clone(input),
              {
                module: InputPollerRethinkDB,
              }
            )
    			],
    			connect_retry_count: -1,
    			connect_retry_periodical: 1000,
    			// requests: {
    			// 	periodical: 1000,
    			// },
          requests: {
    				/**
    				 * runnign at 20 secs intervals
    				 * needs 3 runs to start analyzing from last historical (or from begining)
    				 * it takes 60 secs to complete, so it makes historical each minute
    				 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
    				 * */
    				periodical: function(dispatch){
    					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
              // if(type === 'minute'){
                return cron.schedule('* * * * *', dispatch);//every minute
              // }
              // else{
              //   return cron.schedule('0 * * * *', dispatch);//every hour
              // }
    				},
    				// periodical: 15000,
    				// periodical: 1000,//test
    			},
    		},
    	},

    ],

    // filters: filters,
    filters: [
      // function(doc, opts, next, pipeline){
      //   // let { type, input, input_type, app } = opts
      //   debug('1st filter %O', doc)
      //
      //   if(doc && doc.id === 'default' && doc.data){
      //
      //     Array.each(doc.data, function(group){
      //       if(group.types && group.types.contains('alert')){
      //         debug('1st filter %O', group)
      //         // let hosts = group.hosts
      //         //
      //         // Array.each(hosts, function(host){
      //           debug('1st filter %s %s', new Date(roundSeconds(Date.now() - (2 * MINUTE) )) )
      //           // process.exit(1)
      //
      //           pipeline.get_input_by_id('input.alerts').fireEvent('onRange', {
      //             // id: "once",
      //             id: "range",
      //             Range: "posix "+roundSeconds(Date.now() - (2 * MINUTE) )+"-"+Date.now()+"/*",
      //             query: {
      //               "q": [
      //                 "data",
      //                 // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
      //                 // "metadata"
      //               ],
      //               // "transformation": [
      //               //   {
      //               //   "orderBy": {"index": "host"}
      //               //   },
      //               //   // {
      //               //   //   "slice": [0, 1]
      //               //   // }
      //               //
      //               //
      //               // ],
      //               "filter": [
      //                 // "r.row('metadata')('tag').contains('vhosts')",
      //                 // "r.row('metadata')('tag').contains('nginx')",
      //                 // "r.row('metadata')('tag').contains('enabled')",
      //                 "r.row('metadata')('tag').contains('enabled').and('nginx').and('vhost')",
      //                 // "r.row('data')('code').gt(399)",
      //                 // "r.row('metadata')('path').eq('educativa.checks.vhosts')",
      //                 "r.row('metadata')('type').eq('alert')"
      //               ]
      //             },
      //             params: {},
      //           })
      //
      //
      //         // })
      //       }
      //     })
      //
      //
      //
      //   }
      //   else{
      //     next(doc, opts, next, pipeline)
      //   }
      // },
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        debug('2nd filter %O', doc.data)
        // process.exit(1)

        if(!doc.err){// err === 404
          let notifies = []

          // Array.each(doc.data, function(alerts){
          //   Array.each(alerts, function(alert){
          Array.each(doc.data, function(alert){

              // debug('2nd filter ALERT %O', alert)

              Object.each(alert.data, function(host_alerts, host){
                Object.each(host_alerts, function(vhost_alert, vhost){
                  let notification = true

                  let schema = (vhost_alert.protocol) ? vhost_alert.protocol : (vhost.indexOf(':443') > 0) ? 'https:' : 'http:'
                  vhost = vhost.replace(schema+'//', '')

                  debug('2nd filter AVOID %O', avoid_notify)
                  // process.exit(1)

                  if(avoid_notify && avoid_notify.alerts.vhosts){
                    if(
                      avoid_notify.alerts.vhosts.contains(vhost)
                      || avoid_notify.alerts.vhosts.some(function(item){ return (item instanceof RegExp && item.test(vhost)) ? true: false })
                    ){
                      notification = false
                    }

                  }

                  if(notification === true){

                    /**
                    * https://apps.timwhitlock.info/emoji/tables/unicode
                    **/
                    let notify = "\uD83D\uDE21"+' *Nginx Vhost Alert: * _'+host+"_\n" //title
                    // notify += '`'+vhost+"`\n"
                    notify += '['+schema+'//'+vhost+']('+schema+'//'+vhost+'/)'
                    notify += '```'+JSON.stringify(vhost_alert, null, 1)+"```\n"
                    notify += '*'+moment(vhost_alert.timestamp).local().format("dddd, MMMM Do YYYY, h:mm:ss a")+'*'// _('+moment(vhost_alert.timestamp).fromNow()+")_\n" //time

                    notifies.push(notify)
                  }

                })

              })
            // })
          })

          // debug('2nd filter NOTIFIES %O', notifies)
          // process.exit(1)
          if(notifies.length > 0)
            // next(notifies, opts, next, pipeline)

            /**
            * telegram bot limit rate
            * https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
            **/
            async.eachLimit(
              notifies,
              1,
              function(notify, callback){
                // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
                // callback()
                let wrapped = async.timeout(function(module){
                  next(notify, opts, next, pipeline)
                }, 1001)

                // try{
                wrapped(notify, function(err, data) {
                  if(err){
                    // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
                    callback()
                  }
                })
                // }
                // catch(e){
                //   callback()
                // }
              }
            )
        }


        // if(!doc.err)
          // process.exit(1)


      }
   	],
  	output: [
      {
  			telegram: {
  				id: "output.educativa.alerts.telegram",
  				conn: [
            output
  				],
          message: {parse_mode: 'Markdown'},
  				module: require('js-pipeline.output.telegram'),
          buffer:{
  					size: -1,
  					expire:0
            // expire: 1001,
  				}
  			}
  		}
  	]
  }

  return conf
}
