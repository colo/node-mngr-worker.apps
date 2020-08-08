'use strict'

let debug = require('debug')('Server:Apps:Educativa:Alerts:Vhosts:Pipeline');
let debug_internals = require('debug')('Server:Apps:Educativa:Alerts:Vhosts:Pipeline:Internals');

const path = require('path'),
      os= require('os');

let cron = require('node-cron');


const InputPollerRethinkDB = require ( './input/rethinkdb.js' )

const request = require('request')

let async = require('async')

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

module.exports = function(payload){
  let {input, output, filters, type} = payload

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

    			id: "input.checks",
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
      function(doc, opts, next, pipeline){
        // let { type, input, input_type, app } = opts
        debug('1st filter %O', doc)

        if(doc && doc.id === 'default' && doc.data){

          Array.each(doc.data, function(group){
            if(group.tags && group.tags.contains('nginx') && group.tags.contains('enabled')){
              debug('1st filter %O', group)
              let hosts = group.hosts

              Array.each(hosts, function(host){
                debug('1st filter %s %s', host, new Date(roundSeconds(Date.now() - (5 * MINUTE))) )
                // process.exit(1)

                pipeline.get_input_by_id('input.checks').fireEvent('onRange', {
                  // id: "once",
                  id: "range",
                  Range: "posix "+roundSeconds(Date.now() - (5 * MINUTE) )+"-"+Date.now()+"/*",
                  query: {
                    "q": [
                      "data",
                      // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
                      "metadata"
                    ],
                    // "transformation": [
                    //   {
                    //   "orderBy": {"index": "host"}
                    //   },
                    //   // {
                    //   //   "slice": [0, 1]
                    //   // }
                    //
                    //
                    // ],
                    "filter": [
                      // "r.row('metadata')('tag').contains('nginx')",
                      // "r.row('metadata')('tag').contains('enabled')",
                      "r.row('metadata')('tag').contains('enabled').and('nginx').and('vhost')",
                      // "r.row('data')('code').gt(399).or(r.row.hasFields({'data': 'errno'}))",
                      "r.row('data')('code').gt(399)",
                      "r.row('metadata')('path').eq('educativa.checks.vhosts')",
                      "r.row('metadata')('type').eq('check')",
                      "r.row('metadata')('host').eq('"+host+"')"
                    ]
                  },
                  params: {},
                })


              })
            }
          })



        }
        else{
          next(doc, opts, next, pipeline)
        }
      },
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        // debug('2nd filter %O', doc)
        // process.exit(1)


        if(doc && doc.data && doc.metadata && doc.metadata.from === 'educativa'){
          let timestamp = Date.now()
          let alert = {
            id: 'educativa.alerts.nginx.vhosts.enabled@'+timestamp,
            data: {},
            metadata: {
              id: 'educativa.alerts.nginx.vhosts.enabled@'+timestamp,
              path: 'educativa.alerts.vhosts',
              type: 'alert',
              host: os.hostname(),
              tag: ['alert', 'vhost','enabled', 'nginx', 'port', 'uri', 'url', 'schema', 'protocol'],
              timestamp: timestamp
            }
          }
          // debug('2nd filter %O', doc.data[0])
          Array.each(doc.data, function(groups){
            debug('2nd filter %O', groups)
            Array.each(groups, function(error){
              let server = error.metadata.host
              let port = (error.data.port) ? ':'+error.data.port : ''
              let host = (error.data.host) ? error.data.host : (error.data.hostname) ? error.data.hostname : (error.data.uri) ? error.data.uri: error.data.address

              if(!host) host = ''
              host = host.replace(port, '')

              let protocol = (error.data.protocol) ?  error.data.protocol+'//' : ''
              host = host.replace(protocol, '')

              let id = protocol+host+port
              error.data.timestamp = error.metadata.timestamp
              // error.data.time = {
              //   unix: error.metadata.timestamp,
              //   local: moment(error.metadata.timestamp).local().format("dddd, MMMM Do YYYY, h:mm:ss a"),
              //   relative:moment(error.metadata.timestamp).fromNow()
              // }

              if(!alert.data[server]) alert.data[server] = {}
              if(!alert.data[server][id]) alert.data[server][id] = []

              alert.data[server][id].push(error.data)

            })


          })


          Object.each(alert.data, function(value, server){
            Object.each(value, function(errors, host){
              errors.sort(function (a, b) {
                if (a.timestamp < b.timestamp) {
                  return -1
                }
                if (a.timestamp > b.timestamp) {
                  return 1
                }
                // a must be equal to b
                return 0
              })
            })
          })

          // debug('2nd filter %O', alert.data.colo)

          next(alert, opts, next, pipeline)

        //   let hosts_urls = {}
        //   Array.each(doc.data, function(group){
        //     // debug('2nd filter groups %O', group)
        //     // process.exit(1)
        //     Array.each(group, function(vhost){
        //       // let url = vhost.data.schema+'://'+vhost.data.uri+':'+vhost.data.port
        //       if(!hosts_urls[vhost.metadata.host]) hosts_urls[vhost.metadata.host] = []
        //       hosts_urls[vhost.metadata.host].push(vhost.data.schema+'://'+vhost.data.uri+':'+vhost.data.port)
        //       // debug('2nd filter URL %s', url)
        //     })
        //   })
        //
        //   // let urls_result = {}
        //
        //   let docs = []
        //   Object.each(hosts_urls, function(urls, host){
        //
        //     async.eachLimit(urls, 10, function(url, callback){
        //
        //       request.head({uri: url}, function(error, response, body){
        //         pipeline.get_input_by_id('input.vhosts').fireEvent('onSuspend')
        //         // if(error){
        //         //   debug('request result %O', error)
        //         //   process.exit(1)
        //         // }
        //         let doc = {
        //           id: undefined,
        //           data: {},
        //           metadata: {
        //             path: 'educativa.checks.vhosts',
        //             type: 'periodical',
        //             host: host,
        //             tag: ['vhosts', 'nginx', 'enabled'],
        //             timestamp: Date.now()
        //           }
        //         }
        //
        //         let id = url.replace('://', '.').replace(':', '.')
        //         doc.id = doc.metadata.host+'.'+doc.metadata.path+'.'+id+'@'+doc.metadata.timestamp
        //
        //         if(response){
        //           doc.data = {
        //             headers: response.headers,
        //             code: response.statusCode,
        //             message: response.statusMessage,
        //             host: response.request.uri.host,
        //             hostname: response.request.uri.host,
        //             port: response.request.uri.port,
        //             protocol: response.request.uri.protocol,
        //           }
        //
        //           doc.metadata.tag.push(response.statusCode)
        //
        //
        //           // debug('request result %O %O %s',
        //           //   response.headers,
        //           //   response.statusCode,
        //           //   response.request.uri.host,
        //           //   response.request.uri.hostname,
        //           //   response.request.uri.port,
        //           //   response.request.uri.protocol,
        //           //   host
        //           // )
        //           // process.exit(1)
        //         }
        //         else{
        //           doc.data = error
        //           doc.metadata.tag.push(error.code)
        //           doc.metadata.tag.push('error')
        //         }
        //
        //         docs.push(doc)
        //         callback()
        //       })
        //     }, function(err) {
        //
        //         // if any of the file processing produced an error, err would equal that error
        //         if( err ) {
        //           debug('request ERROR %o', err)
        //         } else {
        //           pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
        //           next(docs, opts, next, pipeline)
        //           // console.log('All files have been processed successfully');
        //         }
        //     });
        //
        //   })
        //
        //
        //
        }

      }
   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.educativa.alerts.rethinkdb",
  				conn: [
            output
  				],
  				module: require('js-pipeline.output.rethinkdb'),
          buffer:{
  					size: 0,
  					expire:0
            // expire: 1001,
  				}
  			}
  		}
  	]
  }

  return conf
}
