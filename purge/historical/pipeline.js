'use stric'


var debug = require('debug')('Server:Apps:Purge:Pipeline');
var debug_internals = require('debug')('Server:Apps:Purge:Pipeline:Internals');


const path = require('path');

var cron = require('node-cron');



// let PollCradle = require('js-pipeline/input/poller/poll/cradle')
//
// PollCradle = require('node-app-cradle-client/load')(PollCradle)
// const InputPollerRethinkDBOS = require ( './input/rethinkdb.os.js' )
const InputPollerRethinkDBPurge = require ( '../index' )

module.exports = {
 input: [
	{
		poll: {
			id: "input.rethinkdb",
			conn: [
				{
					// scheme: 'cradle',
					host:'elk',
					// port: 5984 ,
					db: 'servers',
          table: 'historical',
					module: InputPollerRethinkDBPurge,
					// load: ['apps/os/purge/'],
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
					// return cron.schedule('*/15 * * * *', dispatch);//every 15 mins
          return cron.schedule('0 * * * *', dispatch);//every hour
				}
			},
		},
	},

 ],

  output: [

	]
}
