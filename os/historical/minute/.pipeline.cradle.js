'use stric'

const path = require('path');

var cron = require('node-cron');

let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
    decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))


let PollCradle = require('js-pipeline/input/poller/poll/cradle')

PollCradle = require('node-app-cradle-client/load')(PollCradle)


module.exports = {
 input: [
	{
		poll: {
			id: "input.os.historical.cradle",
			conn: [
				{
					scheme: 'cradle',
					host:'elk',
					//host:'127.0.0.1',
					port: 5984 ,
					db: 'live',
					module: PollCradle,
					load: ['apps/os/historical/minute/']
				}
			],
			requests: {
				/**
				 * runnign at 20 secs intervals
				 * needs 3 runs to start analyzing from last historical (or from begining)
				 * it takes 60 secs to complete, so it makes historical each minute
				 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
				 * */
				periodical: function(dispatch){
					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
          return cron.schedule('*/20 * * * * *', dispatch);//every 20 secs
				},
				// periodical: 15000,
				// periodical: 2000,//test
			},

		},
	}
 ],
 filters: [
    // decompress_filter,
    require('./filter'),
    function(doc, opts, next, pipeline){
      sanitize_filter(
        doc,
        opts,
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
    // sanitize_filter,
    // compress_filter
  ],
	output: [
		//require('./snippets/output.stdout.template'),
		// {
		// 	cradle: {
		// 		id: "output.historical.os.cradle",
		// 		conn: [
		// 			{
		// 				//host: '127.0.0.1',
		// 				host: 'elk',
		// 				port: 5984,
		// 				db: 'historical',
		// 				opts: {
		// 					cache: false,
		// 					raw: false,
		// 					forceSave: false,
		// 				}
		// 			},
		// 		],
		// 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
		// 		buffer:{
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
						db: 'historical',
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
