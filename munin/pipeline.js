'use stric'

let debug = require('debug')('Server:Apps:Munin:Pipeline');
let debug_internals = require('debug')('Server:Apps:Munin:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));
// let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.munin.template'));


const InputPollerMunin = require ( './input/munin.js' )



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
      			}
      		],
      		connect_retry_count: 5,
      		connect_retry_periodical: 5000,
      		requests: {
      			periodical: 5000,
      		},
      	}

    	}
    ],

    filters: [
   		// require('./snippets/filter.sanitize.template'),
       function(doc, opts, next, pipeline){
         let { type, input, input_type } = opts
         let app = opts.app = pipeline

         debug_internals('filter %o', pipeline.outputs[0].options.buffer)

         let new_doc = {data: {}, metadata: {}}
         new_doc.data = doc.data
         new_doc.metadata = {
           path: 'munin.'+doc.id.replace(/\_/, '.', 'g'),
           type: 'periodical',
           host: doc.host
         }
         // opts.input_type.options.id = doc.host
         // opts.app.options.id = 'munin.'+doc.id.replace(/\_/, '.', 'g')

         debug_internals('filter %o %o', new_doc, input_type.options.requests.periodical.length)

         pipeline.outputs[0].options.buffer.size = input_type.options.requests.periodical.length

         sanitize_filter(
           new_doc,
           opts,
           pipeline.output.bind(pipeline),
           pipeline
         )
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
  				}
  			}
  		}
  	]
  }

  return conf
}
