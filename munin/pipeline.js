'use stric'


let debug = require('debug')('Server:Apps:Munin:Pipeline');
let debug_internals = require('debug')('Server:Apps:Munin:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));
// let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.munin.template'));


const InputPollerMunin = require ( './input/munin.js' )

let modules = {}
let meta_doc = { id: '', data: [], metadata: { path: 'munin', type: 'periodical', merged: true }}
let meta_docs = {}

module.exports = function(conn){
  let conf = {
    input: [
    	{
        poll: {
      		id: "input.munin",
      		conn: [
      			{
      				scheme: 'munin',
      				host:'127.0.0.1',
      				port: 4949,
      				module: InputPollerMunin,
      				load: [],
      			},
            // {
      			// 	scheme: 'munin',
      			// 	host:'dev',
      			// 	port: 4949,
      			// 	module: InputPollerMunin,
      			// 	load: [],
      			// },
            // {
      			// 	scheme: 'munin',
      			// 	host:'elk',
      			// 	port: 4949,
      			// 	module: InputPollerMunin,
      			// 	load: [],
      			// }
      		],
      		connect_retry_count: -1,
      		connect_retry_periodical: 1000,
      		requests: {
      			// periodical: 5000,
            periodical: function(dispatch){
    					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
              return cron.schedule('*/5 * * * * *', dispatch);//every 20 secs
    				},
      		},
      	}

    	},
      // {
      //   poll: {
      // 		id: "input.elk.munin",
      // 		conn: [
      // 			{
      // 				scheme: 'munin',
      // 				host:'elk',
      // 				port: 4949,
      // 				module: InputPollerMunin,
      // 				load: [],
      // 			}
      // 		],
      // 		connect_retry_count: -1,
      // 		connect_retry_periodical: 1000,
      // 		requests: {
      // 			// periodical: 5000,
      //       periodical: function(dispatch){
    	// 				// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
      //         return cron.schedule('*/5 * * * * *', dispatch);//every 20 secs
    	// 			},
      // 		},
      // 	}
      //
    	// }
    ],

    filters: [
   		// require('./snippets/filter.sanitize.template'),
       function(doc, opts, next, pipeline){
         let { type, input, input_type } = opts
         let app = opts.app = pipeline

        if(doc.modules){
          if(!modules[doc.host]) modules[doc.host] = {}
          Array.each(doc.modules, function(mod){ modules[doc.host][mod] = false })
          debug_internals('modules %o', doc, modules)
        }
        else{
         // debug_internals('filter %o', pipeline.outputs[0].options.buffer)
         modules[doc.host][doc.id] = true

         if(Object.getLength(doc.data) > 0){
           let new_doc = {data: {}, metadata: {}}
           new_doc.data = doc.data
           let path = 'munin.'+doc.id.replace(/\_/, '.', 'g')
           new_doc.metadata = {
             path: path,
             // type: 'periodical',
             // host: doc.host
           }

           if(!meta_docs[doc.host]) meta_docs[doc.host] = Object.clone(meta_doc)
           // meta_docs[doc.host].data[path] = new_doc
           meta_docs[doc.host].data.push(new_doc)
           meta_docs[doc.host].id = doc.host+'.munin.merged@'+Date.now()
           meta_docs[doc.host].metadata['host'] = doc.host
           // opts.input_type.options.id = doc.host
           // opts.app.options.id = 'munin.'+doc.id.replace(/\_/, '.', 'g')

           // debug_internals('filter %o %o', new_doc, input_type.options.requests.periodical.length)

           // pipeline.outputs[0].options.buffer.size = input_type.options.requests.periodical.length
         }


         debug_internals('modules %o', modules)

         if(Object.every(modules[doc.host], function(val, mod){ return val })){
           debug_internals('META %o', meta_docs[doc.host])
           // meta_docs[doc.host].data = JSON.stringify(meta_docs[doc.host].data)
           sanitize_filter(
             Object.clone(meta_docs[doc.host]),
             opts,
             pipeline.output.bind(pipeline),
             pipeline
           )

           meta_docs[doc.host].data = []
           Object.each(modules[doc.host], function(val, mod){ modules[doc.host][mod] = false })
         }

        }
       },

   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.munin.rethinkdb",
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
  					expire: 0 //ms
            // expire: 999 //ms
  				}
  			}
  		}
  	]
  }

  return conf
}
