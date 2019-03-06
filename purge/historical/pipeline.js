'use stric'


var debug = require('debug')('Server:Apps:Purge:Historical:Pipeline');
var debug_internals = require('debug')('Server:Apps:Purge:Historical:Pipeline:Internals');


const path = require('path');

var cron = require('node-cron');



// let PollCradle = require('js-pipeline/input/poller/poll/cradle')
//
// PollCradle = require('node-app-cradle-client/load')(PollCradle)
// const InputPollerRethinkDBOS = require ( './input/rethinkdb.os.js' )
const InputPollerRethinkDBPurge = require ( '../index' )

module.exports = function(conn){
  let conf = {
    input: [
    {
    	poll: {
    		id: "input.rethinkdb",
        conn: [
          Object.merge(
            Object.clone(conn),
            {
              table: 'historical',
              module: InputPollerRethinkDBPurge,
            }
          )
        ],
    		requests: {
    			/**
    			 * runnign at 20 secs intervals
    			 * needs 3 runs to start analyzing from last stats (or from begining)
    			 * it takes 60 secs to complete, so it makes stats each minute
    			 * */
    			// periodical: 10000,//test
          periodical: function(dispatch){
    				// return cron.schedule('* * * * * *', dispatch);//testing
            return cron.schedule('0 * * * *', dispatch);//every hour
    			}
    		},
    	},
    },

    ],

    output: [

    ]
  }


  return conf
}
