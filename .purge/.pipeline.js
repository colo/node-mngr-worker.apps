'use strict'


var debug = require('debug')('pipeline:os-purge');
var debug_internals = require('debug')('pipeline:os-purge:Internals');


const path = require('path');

var cron = require('node-cron');

module.exports = {
 input: [
	{
		poll: {
			id: "input.os.purge.cradle",
			conn: [
				{
					scheme: 'cradle',
					host:'elk',
					port: 5984 ,
					db: 'dashboard',
					module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/cradle')),
					load: ['apps/os/purge/historical/'],
				}
			],
			requests: {
				/**
				 * runnign at 20 secs intervals
				 * needs 3 runs to start analyzing from last stats (or from begining)
				 * it takes 60 secs to complete, so it makes stats each minute
				 * */
				periodical: 1000,//test
        // periodical: function(dispatch){
				// 	return cron.schedule('19,39,59 * * * *', dispatch);//every 20 mins
				// }
			},
		},
	},
  {
		poll: {
			id: "input.os.compact.cradle",
			conn: [
				{
					scheme: 'cradle',
					host:'elk',
					port: 5984 ,
					db: 'dashboard',
					module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/cradle')),
					load: ['apps/os/purge/compact/'],
				}
			],
			requests: {
				/**
				 * runnign at 20 secs intervals
				 * needs 3 runs to start analyzing from last stats (or from begining)
				 * it takes 60 secs to complete, so it makes stats each minute
				 * */
				periodical: 60000,//test
        // periodical: function(dispatch){
				// 	return cron.schedule('19,39,59 * * * *', dispatch);//every 20 mins
				// }
			},
		},
	}
 ],
 filters: [
   function(docs, opts, next, pipeline){

     let to_remove = [];

     if(typeof(docs) == 'array' || docs instanceof Array || Array.isArray(docs)){
       Array.each(docs, function(doc, index){
         to_remove.push({_id: doc.id, _rev: doc.value, _deleted: true});
         //
         // // if(index == resp.length - 1){
         // //
         // //   this.save({uri: 'dashboard', data: to_remove});
         // // }
       }.bind(this));

       debug_internals('to remove %o', to_remove)
       next(to_remove)
     }

   }
		// require('./snippets/filter.os.statistics.template'),
		// require('./snippets/filter.sanitize.template'),
	],
  output: [
		//require('./snippets/output.stdout.template'),
		{
			cradle: {
				id: "output.os.purge.cradle",
				conn: [
					{
						//host: '127.0.0.1',
						host: 'elk',
						port: 5984,
						db: 'dashboard',
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
					expire: 0
				}
			}
		}
	]
}