'use strict'


var debug = require('debug')('Server:Apps:Purge:UI:Pipeline');
var debug_internals = require('debug')('Server:Apps:Purge:UI:Pipeline:Internals');


const path = require('path');

var cron = require('node-cron');



// let PollCradle = require('js-pipeline/input/poller/poll/cradle')
//
// PollCradle = require('node-app-cradle-client/load')(PollCradle)
// const InputPollerRethinkDBOS = require ( './input/rethinkdb.os.js' )
const InputPollerRethinkDBPurge = require ( '../input/rethinkdb' )
const InputPollerRedisPurge = require ( '../input/redis' )

// let InputPollerRedisPurgeInstance = new InputPollerRedisPurge({
//   host: 'elk',
//   // port: 28015,
//   // port: 28016,
//   db: 0,
//   channel: 'ui',
//   // table: 'ui',
// })

module.exports = function(rethinkdb, redis){
  let conf = {
    input: [
     	{
     		poll: {
     			id: "input.rethinkdb",
     			conn: [
            Object.merge(
              Object.clone(rethinkdb),
              {
                //table: 'ui',
                table: 'periodical',
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
          	// periodical: 5000,//test
           periodical: function(dispatch){
          		// return cron.schedule('* * * * * *', dispatch);//testing
             return cron.schedule('*/30 * * * * *', dispatch);//every minute
          	}
          },
     		},
     	},
      {
     		poll: {
     			id: "input.redis",
     			conn: [
            Object.merge(
              Object.clone(redis),
              {
                //table: 'ui',
                // table: 'periodical',
                // instance: InputPollerRedisPurgeInstance,
                module: InputPollerRedisPurge
              }
            )
    			],
          requests: {
          	/**
          	 * runnign at 20 secs intervals
          	 * needs 3 runs to start analyzing from last stats (or from begining)
          	 * it takes 60 secs to complete, so it makes stats each minute
          	 * */
          	// periodical: 5000,//test
           periodical: function(dispatch){
          		// return cron.schedule('* * * * * *', dispatch);//testing
             return cron.schedule('*/30 * * * * *', dispatch);//every minute
          	}
          },
     		},
     	},
    ],
    // filters: [
    //   function(doc, opts, next, pipeline){
    //     debug_internals('filter %O', doc)
    //     // this.pipeline.hosts.inputs[2].conn_pollers[0].data_hosts = doc.hosts
    //   }
    // ],
    output: [
      function(doc){
        debug('output', doc, this.inputs[1].conn_pollers[0].data_hosts)
        if(doc.hosts)
          this.inputs[1].conn_pollers[0].data_hosts = doc.hosts

      }

    ]

  }

  return conf
}
