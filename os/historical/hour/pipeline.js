'use stric'

const path = require('path');

var cron = require('node-cron');

let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
    decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

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
    				db: 'historical',
    				module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/cradle')),
    				load: ['apps/os/historical/hour/']
    			}
    		],
    		requests: {
    			/**
    			 * runnign at 20 min intervals
    			 * needs 3 runs to start analyzing from last historical (or from begining)
    			 * it takes 60 min to complete, so it makes historical each hour
    			 * */
            periodical: function(dispatch){
            	return cron.schedule('*/20 * * * *', dispatch);//every 20 min
            },
            // periodical: 60000,//test
            // periodical: 10000,//test

    		},
    	},
    }
  ],
  filters: [
   decompress_filter,
   require('./filter'),
   function(doc, opts, next, pipeline){
     sanitize_filter(
       doc,
       opts,
       function(doc, opts, next, pipeline){
         compress_filter(
           doc,
           opts,
           pipeline.output.bind(pipeline),
           pipeline
         )
       },
       // pipeline.output.bind(pipeline),
       pipeline
     )
   }
  ],
  output: [
  	//require('./snippets/output.stdout.template'),
  	{
  		cradle: {
  			id: "output.historical.os.cradle",
  			conn: [
  				{
  					//host: '127.0.0.1',
  					host: 'elk',
  					port: 5984,
  					db: 'historical',
  					opts: {
  						cache: false,
  						raw: false,
  						forceSave: true,
  					}
  				},
  			],
  			module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
  			buffer:{
  				size: 0,
  				expire:0
  			}
  		}
  	}
  ]
}
