'use stric'

var debug = require('debug')('Server:Apps:OS:Historical:Minute:Pipeline');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Pipeline:Internals');

const path = require('path');

var cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

let os_filter = require('./filters/os'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template'));


// let PollCradle = require('js-pipeline/input/poller/poll/cradle')
//
// PollCradle = require('node-app-cradle-client/load')(PollCradle)

const InputPollerRethinkDBOS = require ( './input/rethinkdb.os.js' )


module.exports = function(conn){
  let conf = {
    input: [
    	{
    		poll: {

    			id: "input.os",
    			conn: [
            Object.merge(
              Object.clone(conn),
              {
                // path_key: 'os',
                module: InputPollerRethinkDBOS,
              }
            )
    			],
    			connect_retry_count: 5,
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
    				// periodical: function(dispatch){
    				// 	// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
            //   return cron.schedule('*/20 * * * * *', dispatch);//every 20 secs
    				// },
    				// periodical: 15000,
    				periodical: 2000,//test
    			},
    		},
    	}
    ],

    filters: [
   		// require('./snippets/filter.sanitize.template'),
       function(doc, opts, next, pipeline){
         let { type, input, input_type, app } = opts

         if(
     				typeof(doc) == 'array'
     				|| doc instanceof Array
     				|| Array.isArray(doc)
     				&& doc.length > 0 && doc[0].data && doc[0].data !== null
     				&& doc[doc.length - 1] && doc[doc.length - 1].data && doc[doc.length - 1].data !== null
     			){
            let path = doc[0].metadata.path;
            switch(path){
              case 'os':
                os_filter(
                  doc,
                  opts,
                  function(doc, opts, next, pipeline){
                    sanitize_filter(
                      doc,
                      opts,
                      pipeline.output.bind(pipeline),
                      pipeline
                    )
                  },
                  // sanitize_filter,
                  pipeline
                )

                break

              default:
                sanitize_filter(
                  doc,
                  opts,
                  pipeline.output.bind(pipeline),
                  pipeline
                )
            }

          }

         // if(app.options.id == 'procs'){
         //   procs_filter(
         //     doc,
         //     opts,
         //     function(doc, opts, next, pipeline){
         //       sanitize_filter(
         //         doc,
         //         opts,
         //         pipeline.output.bind(pipeline),
         //         pipeline
         //       )
         //     },
         //     // sanitize_filter,
         //     pipeline
         //   )
         // }
         // else{
         //
         //   sanitize_filter(
         //     doc,
         //     opts,
         //     pipeline.output.bind(pipeline),
         //     pipeline
         //   )
         // }


       },

   	],

    // filters: [
    //   // decompress_filter,
    //   require('./filter'),
    //   function(doc, opts, next, pipeline){
    //     sanitize_filter(
    //       doc,
    //       opts,
    //       // function(doc, opts, next, pipeline){
    //       //   compress_filter(
    //       //     doc,
    //       //     opts,
    //       //     pipeline.output.bind(pipeline),
    //       //     pipeline
    //       //   )
    //       // },
    //       pipeline.output.bind(pipeline),
    //       pipeline
    //     )
    //   }
    //   // sanitize_filter,
    //   // compress_filter
    // ],
    output: [
      function(doc){
        let output = require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template'))
        output(JSON.encode(doc))
      }

    ]
  	// output: [
    //   {
  	// 		rethinkdb: {
  	// 			id: "output.os.rethinkdb",
  	// 			conn: [
  	// 				{
    //           host: 'elk',
  	// 					port: 28015,
  	// 					db: 'servers',
    //           table: 'historical',
  	// 				},
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
