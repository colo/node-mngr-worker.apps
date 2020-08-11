'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Pipeline');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')



// const InputPollerRethinkDB = require ( './input/rethinkdb.js' )


// let hooks = {}

// const sleep = (milliseconds) => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds))
// }
//
// const pauseable = require('pauseable')



module.exports = function(payload){
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
            input
            // Object.merge(
            //   Object.clone(input),
            //   {
            //     module: InputPollerRethinkDB,
            //   }
            // )
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
              if(input.type === 'inmediate' || input.type === 'second'){
                return cron.schedule('* * * * * *', dispatch);//every second
              }
              else if(input.type === 'minute'){
                return cron.schedule('* * * * *', dispatch);//every minute
                // return cron.schedule('*/10 * * * * *', dispatch);//DEVEL
              }
              else if(input.type === 'hour'){
                // return cron.schedule('0 * * * *', dispatch);//every hour 0x:00
                // return cron.schedule('*/10 * * * *', dispatch);//every 10 minutes
                return cron.schedule('* * * * *', dispatch);//every minute
                // return cron.schedule('*/10 * * * * *', dispatch);//testing ML
              }
              // else if(input.type === 'day'){
              else{
                // return cron.schedule('0 0 * * *', dispatch);//every day...00:00
                return cron.schedule('0 * * * *', dispatch);//every hour 0x:00
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
      //          if(input.type === 'inmediate' || input.type === 'second'){
      //            return cron.schedule('* * * * * *', dispatch);//every second
      //          }
      //          else if(input.type === 'minute'){
      //            return cron.schedule('* * * * *', dispatch);//every minute
      //          }
      //          else if(input.type === 'hour'){
      //            return cron.schedule('0 * * * *', dispatch);//every hour
      //            // return cron.schedule('*/10 * * * *', dispatch);//testing ML
      //          }
      //          // else if(input.type === 'day'){
      //          else {
      //            return cron.schedule('0 0 * * *', dispatch);//every day
      //            // return cron.schedule('*/10 * * * * *', dispatch);//testing ML
      //          }
   		// 		    },
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
      {
  			rethinkdb: {
  				id: "output.historical.minute.rethinkdb",
  				conn: [
            output
  				],
  				module: require('js-pipeline.output.rethinkdb'),
          buffer:{
  					// size: 1,
  					// expire: 60001,
            size: -1,//-1 =will add until expire | 0 = no buffer | N > 0 = limit buffer no more than N
      			// expire: 60000, //miliseconds until saving
      			// periodical: 10000 //how often will check if buffer timestamp has expire
            expire: 1000, //miliseconds until saving
      			periodical: 500 //how often will check if buffer timestamp has expire
  				}
  			}
  		}
  	]
  }

  return conf
}
