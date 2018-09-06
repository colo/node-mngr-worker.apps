'use stric'

var debug = require('debug')('filter:os');
var debug_internals = require('debug')('filter:os:Internals');

const path = require('path');

let procs_filter = require('./filters/proc'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
    compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

PollHttp = require('node-app-http-client/load')(PollHttp)

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
					module: PollHttp,
					// load: ['apps/info/os/']
          load: ['apps/os/info/os/']
				}
			],
			requests: {
				periodical: 1000,
			},
		},
	},
  {
		poll: {
			id: "input.os.procs.http",
			conn: [
				{
					scheme: 'http',
					host:'127.0.0.1',
					port: 8081,
					module: PollHttp,
          load: ['apps/os/info/procs/']
				}
			],
			requests: {
				periodical: 1000,//ms
			},
		},
	}
 ],
 filters: [
		// require('./snippets/filter.sanitize.template'),
    function(doc, opts, next, pipeline){
      let { type, input, input_type, app } = opts

      // console.log(app.options.id)

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
        // console.log('os doc', doc.data)

        if(doc && doc.uptime)
          pipeline.current_uptime = doc.uptime


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
			couchdb: {
				id: "output.os.couchdb",
				conn: [
					{
            scheme: 'http',
						host: 'elk',
						port: 5984,
						db: 'live',
						opts: {
						},
					},
				],
				module: require('js-pipeline/output/couchdb'),
        buffer:{
					size: 0,
					expire:0
				}
			}
		}
	]
}
