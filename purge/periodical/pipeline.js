'use strict'

let debug = require('debug')('Server:Apps:Purge:Periodical:Pipeline');
let debug_internals = require('debug')('Server:Apps:Purge:Periodical:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')



const InputPollerRethinkDBDelete = require ( './input/rethinkdb.delete.js' )
// const OutputRethinkDBDelete = require ( './output/rethinkdb.delete.js' )

// let hooks = {}

// const sleep = (milliseconds) => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds))
// }
//
// const pauseable = require('pauseable')



module.exports = function(payload){
  // let {input, output, filters, type} = payload
  let {input, output, filters, opts} = payload

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

    			id: "input.periodical",
          suspended: (opts && opts.suspended) ? opts.suspended : false,
    			conn: [
            Object.merge(
              Object.clone(input),
              {
                // path_key: 'os',
                module: InputPollerRethinkDBDelete,
              }
            )
    			],
    			connect_retry_count: -1,
    			connect_retry_periodical: 1000,
    			// requests: {
    			// 	periodical: 1000,
    			// },
          requests: {
    				periodical: function(dispatch){
    					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
              if(input.type === 'periodical' || input.type === 'minute'){
                return cron.schedule('* * * * *', dispatch);//every minute
                // return cron.schedule('*/10 * * * * *', dispatch);//testing
              }
              else if(input.type === 'hour'){
                return cron.schedule('0 * * * *', dispatch);//every hour 0x:00
                // return cron.schedule('*/10 * * * * *', dispatch);//testing
              }
              else if(input.type === 'day'){
                return cron.schedule('0 0 * * *', dispatch);//every day...00:00
                // return cron.schedule('*/10 * * * * *', dispatch);//testing ML
              }
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

    filters: filters,
    // filters: [
    //   filter_from_default_query_get_lasts,
    //   filter_from_lasts_get_historical_ranges,
    //   filter_from_ranges_create_stats
   	// ],
  	output: [
      function(doc){
        debug('OUTPUT', doc)
        // process.exit(1)
      }
      // {
  		// 	rethinkdb: {
  		// 		id: "output.historical.minute.rethinkdb",
  		// 		conn: [
      //       output
  		// 		],
  		// 		module: OutputRethinkDBDelete,
      //     buffer:{
  		// 			size: 0,
  		// 			expire:0
  		// 		}
  		// 	}
  		// }
  	]
  }

  return conf
}
