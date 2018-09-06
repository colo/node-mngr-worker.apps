'use stric'


var debug = require('debug')('pipeline:os-purge:live');
var debug_internals = require('debug')('pipeline:os-purge:live:Internals');


const path = require('path');

var cron = require('node-cron');



let PollCradle = require('js-pipeline/input/poller/poll/cradle')

PollCradle = require('node-app-cradle-client/load')(PollCradle)


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
					db: 'live',
					module: PollCradle,
					load: ['apps/os/purge/'],
				}
			],
			requests: {
				/**
				 * runnign at 20 secs intervals
				 * needs 3 runs to start analyzing from last stats (or from begining)
				 * it takes 60 secs to complete, so it makes stats each minute
				 * */
				// periodical: 10000,//test
        periodical: function(dispatch){
					return cron.schedule('*/15 * * * *', dispatch);//every 15 secs
				}
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
					db: 'live',
					module: require('js-pipeline/input/poller/poll/cradle'),
					load: ['apps/os/purge/compact/'],
				}
			],
			requests: {
				/**
				 * runnign at 20 secs intervals
				 * needs 3 runs to start analyzing from last stats (or from begining)
				 * it takes 60 secs to complete, so it makes stats each minute
				 * */
				// periodical: 60000,//test
        periodical: function(dispatch){
					return cron.schedule('0 * * * *', dispatch);
				}
			},
		},
	},
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
		// {
		// 	cradle: {
		// 		id: "output.os.purge.cradle",
		// 		conn: [
		// 			{
		// 				//host: '127.0.0.1',
		// 				host: 'elk',
		// 				port: 5984,
		// 				db: 'live',
		// 				opts: {
		// 					cache: false,
		// 					raw: false,
		// 					forceSave: false,
		// 				}
		// 			},
		// 		],
		// 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
		// 		buffer:{
		// 			size: 100,
		// 			expire: 5000
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
					size: -1,
					expire:60000
				}
			}
		}
	]
}
