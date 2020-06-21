'use strict'

let debug = require('debug')('Server:Apps:Educativa:Checks:Vhosts:Pipeline');
let debug_internals = require('debug')('Server:Apps:Educativa:Checks:Vhosts:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');


const InputPollerRethinkDB = require ( './input/rethinkdb.js' )

const request = require('request')

let async = require('async')

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

// let hosts_checks = {}

let shuffle = function (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const { fork } = require('child_process');

let forks = {}

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

    			id: "input.vhosts",
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
                return cron.schedule('*/5 * * * * *', dispatch);//every minute
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
        // debug('1st filter %O', doc)

        if(doc && doc.id === 'default' && doc.data){

          Array.each(doc.data, function(group){
            if(group.tags && group.tags.contains('nginx') && group.tags.contains('enabled')){
              debug('1st filter %O', group)
              let hosts = group.hosts

              // Array.each(hosts, function(host){
                // debug('1st filter %s %s', host, new Date(roundSeconds(Date.now() - MINUTE)) )
                debug('1st filter %s %s', new Date(roundSeconds(Date.now() - MINUTE)) )
                // process.exit(1)

                // hosts_checks[host] = false

                pipeline.get_input_by_id('input.vhosts').fireEvent('onRange', {
                  // id: "once",
                  id: "range",
                  Range: "posix "+roundSeconds(Date.now() - MINUTE )+"-"+Date.now()+"/*",
                  query: {
                    index: false,
                    "q": [
                      "data",
                      // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
                      "metadata"
                    ],
                    // "transformation": [
                    //   {
                    //   "orderBy": {"index": "r.desc(timestamp)"}
                    //   },
                    //   {
                    //     "slice": [0, 1]
                    //   }
                    //
                    //
                    // ],
                    "filter": [
                      "r.row('metadata')('tag').contains('enabled').and('nginx').and('vhost')",
                      // "r.row('metadata')('host').eq('"+host+"')",
                      "r.row('metadata')('type').eq('periodical')"
                    ]
                  },
                  params: {},
                })


              // })
            }
          })



        }
        else{
          next(doc, opts, next, pipeline)
        }
      },
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        // debug('2nd filter %O', doc.data)
        // process.exit(1)

        if(doc && doc.data && doc.metadata && doc.metadata.from === 'vhosts'){

          pipeline.get_input_by_id('input.vhosts').fireEvent('onSuspend')


          let hosts_urls = {}
          let hosts= []
          Array.each(doc.data, function(row){
            if(!hosts_urls[row.metadata.host]) hosts_urls[row.metadata.host] = []

            hosts_urls[row.metadata.host].push(row.data.schema+'://'+row.data.uri+':'+row.data.port)
            hosts.combine([row.metadata.host])
          })


          debug('2nd filter groups %O', hosts)
          // process.exit(1)
          async.eachLimit(hosts, 20, function(host, callback){//max forks => 5
          // async.eachOf(hosts, function(host, index, callback){//max forks => 5
            debug('2nd filter groups %O', host)
            try{
              if(!forks[host]){
                forks[host] = fork(process.cwd()+'/apps/educativa/checks/libs/fork_filter', [
                  path.join(process.cwd(), '/apps/educativa/checks/filters/vhosts'),
                ])

                forks[host].on('message', function(msg){
                  let data = msg.result
                  let doc = msg.doc
                  debug('result %o %o', data, doc)
                  // process.exit(1)
                  // delete forks[host]

                  next(data, opts, next, pipeline)
                  try{
                    callback()
                  }
                  catch(e){
                    debug('callback err', e)
                  }

                  // // process.exit(1)
                  // // let doc = Object.clone(real_data)
                  //
                  // let key = Object.keys(data)[0]
                  // doc.data = data[key]
                  // doc.metadata.format = format
                  // // next(doc, opts, next, pipeline)
                  //
                  // sanitize_filter(
                  //   doc,
                  //   opts,
                  //   pipeline.output.bind(pipeline),
                  //   pipeline
                  // )
                  //
                  // // // process.exit(1)
                })

              }

              forks[host].send({
                params: [host, hosts_urls[host]],
                // doc:  Object.clone(real_data)
              })
            }
            catch(e){
              debug('ERROR', e)
              // process.exit(1)
              callback()
            }
          }, function(err) {

              // if any of the file processing produced an error, err would equal that error
              if( err ) {
                debug('request ERROR %o', err)
              } else {
                debug('request END')
                // process.exit(1)
                // debug('request SAVE %O', docs)
                //
                // //resume if every host has been checked
                // // if(Object.every(hosts_checks, function(value, host){ return value })){
                // //   pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
                // // }
                // // debug('2nd filter groups %O', docs)
                // // process.exit(1)
                //
                forks = {}
                pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
                //
                // next(docs, opts, next, pipeline)
                // // console.log('All files have been processed successfully');
              }
          });

          // let docs = []
          // // Object.each(hosts_urls, function(urls, host){
          //
          //   // hosts_checks[host] = true
          //
          //   async.eachLimit(checks, 5, function(check, callback){//current nginx limit 5r/s
          //     let {url, host} = check
          //     // -> 10 sec timeout
          //     request.head({uri: url, timeout: 10000}, function(error, response, body){
          //       if(response && response.statusCode)
          //         debug('request result %s %s %O ', host, url, response.statusCode)
          //
          //       // pipeline.get_input_by_id('input.vhosts').fireEvent('onSuspend')
          //       // if(error){
          //       //   debug('request result %O', error)
          //       //   process.exit(1)
          //       // }
          //       let doc = {
          //         id: undefined,
          //         data: {},
          //         metadata: {
          //           path: 'educativa.checks.vhosts',
          //           type: 'check',
          //           host: host,
          //           tag: ['check', 'vhost','enabled', 'nginx', 'port', 'uri', 'url', 'schema', 'protocol'],
          //           timestamp: Date.now()
          //         }
          //       }
          //
          //       let id = url.replace('://', '.').replace(':', '.')
          //       doc.id = doc.metadata.host+'.'+doc.metadata.path+'.'+id+'@'+doc.metadata.timestamp
          //       doc.metadata.id = doc.id
          //
          //       if(response){
          //         doc.data = {
          //           headers: response.headers,
          //           code: response.statusCode,
          //           message: response.statusMessage,
          //           host: response.request.uri.host,
          //           hostname: response.request.uri.host,
          //           port: response.request.uri.port,
          //           protocol: response.request.uri.protocol,
          //         }
          //
          //         doc.metadata.tag.push(response.statusCode)
          //
          //
          //         // debug('request result %O %O %s',
          //         //   response.headers,
          //         //   response.statusCode,
          //         //   response.request.uri.host,
          //         //   response.request.uri.hostname,
          //         //   response.request.uri.port,
          //         //   response.request.uri.protocol,
          //         //   host
          //         // )
          //         // process.exit(1)
          //       }
          //       else{
          //         Object.each(error, function(value, key){
          //           error[key] = value.toString()
          //         })
          //         doc.data = error
          //         doc.data.uri = url
          //         if(error.code) doc.metadata.tag.push(error.code)
          //         error.code = (error.code) ? error.code : (error.reason) ? error.reason : 'unknown'
          //         doc.metadata.tag.push('error')
          //       }
          //
          //       docs.push(doc)
          //       callback()
          //     })
          //   }, function(err) {
          //
          //       // if any of the file processing produced an error, err would equal that error
          //       if( err ) {
          //         debug('request ERROR %o', err)
          //       } else {
          //         debug('request SAVE %O', docs)
          //
          //         //resume if every host has been checked
          //         // if(Object.every(hosts_checks, function(value, host){ return value })){
          //         //   pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
          //         // }
          //         // debug('2nd filter groups %O', docs)
          //         // process.exit(1)
          //
          //         pipeline.get_input_by_id('input.vhosts').fireEvent('onResume')
          //
          //         next(docs, opts, next, pipeline)
          //         // console.log('All files have been processed successfully');
          //       }
          //   });

          // })



        }

      }
   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.educativa.checks.vhosts.rethinkdb",
  				conn: [
            output
  				],
  				module: require('js-pipeline.output.rethinkdb'),
          buffer:{
  					size: 0,
  					// expire: 0
            expire: 1001,
  				}
  			}
  		}
  	]
  }

  return conf
}
