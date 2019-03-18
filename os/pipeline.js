'use stric'

var debug = require('debug')('pipeline:os');
var debug_internals = require('debug')('filter:os:Internals');

const path = require('path');

let cron = require('node-cron');

let procs_filter = require('./filters/proc'),
    networkInterfaces_filter = require('./filters/networkInterfaces'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

let OSPollHttp = require('node-app-http-client/load')(PollHttp)
let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)

module.exports = {
 input: [
	{
		poll: {
			id: "input.os.http",
			conn: [
				{
					scheme: 'http',
					host:'127.0.0.1',
					port: 8081,
					module: OSPollHttp,
					// load: ['apps/info/os/']
          load: ['apps/os/input/os']
				}
			],
			requests: {
				// periodical: 1000,
        periodical: function(dispatch){
          // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
          return cron.schedule('* * * * * *', dispatch);//every 20 secs
        },
			},
		},
	},
  // {
	// 	poll: {
	// 		id: "input.os.procs.http",
	// 		conn: [
	// 			{
	// 				scheme: 'http',
	// 				host:'127.0.0.1',
	// 				port: 8081,
	// 				module: ProcsPollHttp,
  //         load: ['apps/os/input/procs']
	// 			}
	// 		],
	// 		requests: {
	// 			periodical: 1000,//ms
	// 		},
	// 	},
	// }
 ],
 filters: [
		// require('./snippets/filter.sanitize.template'),
    function(doc, opts, next, pipeline){
      let { type, input, input_type, app } = opts

      // console.log('os filter',doc)

      // if(app.options.id == 'os.procs'){
      if(app.options.id == 'procs'){
        procs_filter(
          doc,
          opts,
          function(doc, opts, next, pipeline){
            sanitize_filter(
              doc,
              opts,
              // function(doc, opts, next, pipeline){
              //   zipson_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              // },
              // function(doc, opts, next, pipeline){
              //   lzutf8_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              // },
              // function(doc, opts, next, pipeline){
              //   lzstring_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              // },
              // function(doc, opts, next, pipeline){
              //   compress_filter(
              //     doc,
              //     opts,
              //     pipeline.output.bind(pipeline),
              //     pipeline
              //   )
              // },
              pipeline.output.bind(pipeline),
              pipeline
            )
          },
          // sanitize_filter,
          pipeline
        )
      }
      else{
        if(doc && doc.uptime)
          pipeline.current_uptime = doc.uptime

        if(doc && doc.networkInterfaces){//create an extra doc for networkInterfaces
          networkInterfaces_filter(
            doc.networkInterfaces,
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

          delete doc.networkInterfaces

          // Object.each(doc, function(data, key){
          //   let new_doc = {
          //     data: data,
          //     metadata:{
          //       path: 'os.'+key
          //     }
          //   }
          //
          //   sanitize_filter(
          //     new_doc,
          //     opts,
          //     // function(doc, opts, next, pipeline){
          //     //   zipson_filter(
          //     //     doc,
          //     //     opts,
          //     //     pipeline.output.bind(pipeline),
          //     //     pipeline
          //     //   )
          //     // },
          //     // function(doc, opts, next, pipeline){
          //     //   lzutf8_filter(
          //     //     doc,
          //     //     opts,
          //     //     pipeline.output.bind(pipeline),
          //     //     pipeline
          //     //   )
          //     // },
          //     // function(doc, opts, next, pipeline){
          //     //   lzstring_filter(
          //     //     doc,
          //     //     opts,
          //     //     pipeline.output.bind(pipeline),
          //     //     pipeline
          //     //   )
          //     // },
          //     // function(doc, opts, next, pipeline){
          //     //   compress_filter(
          //     //     doc,
          //     //     opts,
          //     //     pipeline.output.bind(pipeline),
          //     //     pipeline
          //     //   )
          //     // },
          //     pipeline.output.bind(pipeline),
          //     pipeline
          //   )
          // })
        }
        // else if(doc){//mounts, blockdevices...
        //   sanitize_filter(
        //     doc,
        //     opts,
        //     // function(doc, opts, next, pipeline){
        //     //   zipson_filter(
        //     //     doc,
        //     //     opts,
        //     //     pipeline.output.bind(pipeline),
        //     //     pipeline
        //     //   )
        //     // },
        //     // function(doc, opts, next, pipeline){
        //     //   lzutf8_filter(
        //     //     doc,
        //     //     opts,
        //     //     pipeline.output.bind(pipeline),
        //     //     pipeline
        //     //   )
        //     // },
        //     // function(doc, opts, next, pipeline){
        //     //   lzstring_filter(
        //     //     doc,
        //     //     opts,
        //     //     pipeline.output.bind(pipeline),
        //     //     pipeline
        //     //   )
        //     // },
        //     // function(doc, opts, next, pipeline){
        //     //   compress_filter(
        //     //     doc,
        //     //     opts,
        //     //     pipeline.output.bind(pipeline),
        //     //     pipeline
        //     //   )
        //     // },
        //     pipeline.output.bind(pipeline),
        //     pipeline
        //   )
        //
        // }


        sanitize_filter(
          doc,
          opts,
          // function(doc, opts, next, pipeline){
          //   zipson_filter(
          //     doc,
          //     opts,
          //     pipeline.output.bind(pipeline),
          //     pipeline
          //   )
          // },
          // function(doc, opts, next, pipeline){
          //   lzutf8_filter(
          //     doc,
          //     opts,
          //     pipeline.output.bind(pipeline),
          //     pipeline
          //   )
          // },
          // function(doc, opts, next, pipeline){
          //   lzstring_filter(
          //     doc,
          //     opts,
          //     pipeline.output.bind(pipeline),
          //     pipeline
          //   )
          // },
          // function(doc, opts, next, pipeline){
          //   compress_filter(
          //     doc,
          //     opts,
          //     pipeline.output.bind(pipeline),
          //     pipeline
          //   )
          // },
          pipeline.output.bind(pipeline),
          pipeline
        )


      }


    },

	],
	output: [
    // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
		//require('./snippets/output.stdout.template'),
		// {
		// 	cradle: {
		// 		id: "output.os.cradle",
		// 		conn: [
		// 			{
		// 				host: 'elk',
		// 				port: 5984,
		// 				db: 'live',
		// 				opts: {
		// 					cache: false,
		// 					raw: false,
		// 					forceSave: false,
		// 				},
		// 			},
		// 		],
		// 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
    //     buffer:{
		// 			size: 0,
		// 			expire:0
		// 		}
		// 	}
		// }
    {
			rethinkdb: {
				id: "output.os.rethinkdb",
				conn: [
					{
            host: 'elk',
						port: 28015,
						db: 'servers',
            table: 'periodical',
					},
				],
				module: require('js-pipeline/output/rethinkdb'),
        buffer:{
					size: -1,
					// expire:0
          expire: 999,
				}
			}
		}
	]
}