'use strict'

let debug = require('debug')('Server:Apps:Educativa:Checks:Vhosts:Pipeline');
let debug_internals = require('debug')('Server:Apps:Educativa:Checks:Vhosts:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');


const InputPollerRethinkDB = require ( './input/rethinkdb.js' )




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
                return cron.schedule('*/10 * * * * *', dispatch);//every minute
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
      // {
    	// 	poll: {
      //
    	// 		id: "input.historical",
      //     suspended: true,
    	// 		conn: [
      //       Object.merge(
      //         Object.clone(output),//yeap...fetches from the output table
      //         {
      //           // path_key: 'logs',
      //           module: InputPollerRethinkDB,
      //           // table: input.table+'_historical'
      //         }
      //       )
    	// 		],
    	// 		connect_retry_count: -1,
    	// 		connect_retry_periodical: 1000,
    	// 		// requests: {
    	// 		// 	periodical: 1000,
    	// 		// },
      //     requests: {
    	// 			/**
    	// 			 * runnign at 20 secs intervals
    	// 			 * needs 3 runs to start analyzing from last historical (or from begining)
    	// 			 * it takes 60 secs to complete, so it makes historical each minute
    	// 			 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
    	// 			 * */
      //        periodical: function(dispatch){
     	// 				// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
      //          if(type === 'minute'){
      //            return cron.schedule('* * * * *', dispatch);//every minute
      //          }
      //          else{
      //            return cron.schedule('0 * * * *', dispatch);//every hour
      //          }
     	// 			},
    	// 			// periodical: 15000,
    	// 			// periodical: 1000,//test
    	// 		},
    	// 	},
    	// }
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

              Array.each(hosts, function(host){

                pipeline.get_input_by_id('input.vhosts').fireEvent('onOnce', {
                  id: "once",
                  query: {
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
                      "r.row('metadata')('tag').eq(['enabled'])",
                      "r.row('metadata')('host').eq('"+host+"')",
                      "r.row('metadata')('type').eq('periodical')"
                    ]
                  },
                  params: {},
                })
                debug('1st filter %O', host)
                
              })
            }
          })

          // let { type, input, input_type, app } = opts


          // Array.each(doc.data, function(group, index){
          //
          //   Array.each(group.hosts, function(host){
          //     pipeline.get_input_by_id('input.historical').fireEvent('onOnce', {
          //       id: "once",
          //       query: {
          //         "q": [
          //           "data",
          //           // {"metadata": ["host", "tag", "timestamp", "path", "range"]}
          //           "metadata"
          //         ],
          //         "transformation": [
          //           {
          //           "orderBy": {"index": "r.desc(timestamp)"}
          //           },
          //           {
          //             "slice": [0, 1]
          //           }
          //
          //
          //         ],
          //         "filter": ["r.row('metadata')('path').eq('"+group.path+"')", "r.row('metadata')('host').eq('"+host+"')", "r.row('metadata')('type').eq('"+type+"')"]
          //       },
          //       params: {},
          //     })
          //   })
          //
          // })

        }
        else{
          next(doc, opts, next, pipeline)
        }
      },
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        debug('2nd filter %O', doc)
      }
   	],
  	// output: [
    //   {
  	// 		rethinkdb: {
  	// 			id: "output.historical.minute.rethinkdb",
  	// 			conn: [
    //         output
  	// 			],
  	// 			module: require('js-pipeline/output/rethinkdb'),
    //       buffer:{
  	// 				size: 0,
  	// 				expire:0
  	// 			}
  	// 		}
  	// 	}
  	// ]
  }

  return conf
}
