'use strict'


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

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}


module.exports = function(munin, out){
  let conf = {
    input: [
    	{
        poll: {
      		id: "input.localhost.munin",
      		conn: [
            Object.merge(
              Object.clone(munin),
              {module: InputPollerMunin, load: []},
            ),

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
      //       // Object.merge(
      //       //   Object.clone(munin),
      //       //   {module: InputPollerMunin, load: []},
      //       // ),
      //       Object.merge(
      //         Object.clone(munin),
      //         {
      //           host: 'elk',
      //           module: InputPollerMunin, load: []
      //         },
      //       )
      // 			// {
      // 			// 	scheme: 'munin',
      // 			// 	host:'dev',
      // 			// 	port: 4949,
      // 			// 	module: InputPollerMunin,
      // 			// 	load: [],
      // 			// },
      //       // {
      // 			// 	scheme: 'munin',
      // 			// 	host:'elk',
      // 			// 	port: 4949,
      // 			// 	module: InputPollerMunin,
      // 			// 	load: [],
      // 			// }
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
    	// },

    ],

    filters: [
   		// require('./snippets/filter.sanitize.template'),

      /**
      * NOT merge
      **/
      function(doc, opts, next, pipeline){
        let { type, input, input_type } = opts
        let app = opts.app = pipeline

        // if(!doc.modules && Object.getLength(doc.data) > 0){//discard modules doc
        if(doc.data && doc.config && Object.getLength(doc.data) > 0 && Object.getLength(doc.config) > 0){//discard modules doc
          debug('filter %o', doc)

          let new_doc = {data: {}, config: {}, metadata: {}}
          new_doc.data = doc.data
          new_doc.config = doc.config
          let path = 'munin.'+doc.id.replace(/\_/, '.', 'g')
          let timestamp = roundMilliseconds(Date.now())
          new_doc.id = doc.host+'.'+path+'@'+timestamp
          new_doc.metadata = {
            id: new_doc.id,
            path: path,
            type: 'periodical',
            host: doc.host,
            timestamp: timestamp,
            tag: ['munin', doc.id.replace(/\_/, '.', 'g')]
          }


          // opts.input_type.options.id = doc.host
          // opts.app.options.id = 'munin.'+doc.id.replace(/\_/, '.', 'g')

          // debug_internals('filter %o %o', new_doc, input_type.options.requests.periodical.length)

          // pipeline.outputs[0].options.buffer.size = input_type.options.requests.periodical.length
          // let redis = /redis/
          // if(redis.test(path)){
          //   debug('redis doc %o', new_doc)
          //   process.exit(1)
          // }

          sanitize_filter(
            new_doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )
        }


      },
      /**
      * merge
      **/
      // function(doc, opts, next, pipeline){
      //  let { type, input, input_type } = opts
      //  let app = opts.app = pipeline
      //
      //   if(doc.modules){
      //     if(!modules[doc.host]) modules[doc.host] = {}
      //     Array.each(doc.modules, function(mod){ modules[doc.host][mod] = false })
      //     debug_internals('modules %o', doc, modules)
      //   }
      //   else{
      //    // debug_internals('filter %o', pipeline.outputs[0].options.buffer)
      //    modules[doc.host][doc.id] = true
      //
      //    if(Object.getLength(doc.data) > 0){
      //      let new_doc = {data: {}, metadata: {}}
      //      new_doc.data = doc.data
      //      let path = 'munin.'+doc.id.replace(/\_/, '.', 'g')
      //      new_doc.metadata = {
      //        path: path,
      //        // type: 'periodical',
      //        // host: doc.host
      //      }
      //
      //      if(!meta_docs[doc.host]) meta_docs[doc.host] = Object.clone(meta_doc)
      //      // meta_docs[doc.host].data[path] = new_doc
      //      meta_docs[doc.host].data.push(new_doc)
      //      meta_docs[doc.host].id = doc.host+'.munin.merged@'+Date.now()
      //      meta_docs[doc.host].metadata['host'] = doc.host
      //      // opts.input_type.options.id = doc.host
      //      // opts.app.options.id = 'munin.'+doc.id.replace(/\_/, '.', 'g')
      //
      //      // debug_internals('filter %o %o', new_doc, input_type.options.requests.periodical.length)
      //
      //      // pipeline.outputs[0].options.buffer.size = input_type.options.requests.periodical.length
      //    }
      //
      //
      //    debug_internals('modules %o', modules)
      //
      //    if(Object.every(modules[doc.host], function(val, mod){ return val })){
      //      debug_internals('META %o', meta_docs[doc.host])
      //      // meta_docs[doc.host].data = JSON.stringify(meta_docs[doc.host].data)
      //      sanitize_filter(
      //        Object.clone(meta_docs[doc.host]),
      //        opts,
      //        pipeline.output.bind(pipeline),
      //        pipeline
      //      )
      //
      //      meta_docs[doc.host].data = []
      //      Object.each(modules[doc.host], function(val, mod){ modules[doc.host][mod] = false })
      //    }
      //
      //   }
      // },

   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.munin.rethinkdb",
  				conn: [
            Object.merge(
              Object.clone(out),
              {table: 'munin'}
            )
  				],
  				module: require('js-pipeline.output.rethinkdb'),
          buffer:{
  					size: -1, //-1
  					// expire: 0 //ms
            expire: 1000, //ms
            periodical: 999 //how often will check if buffer timestamp has expire
  				}
  			}
  		}
  	]
  }

  return conf
}
