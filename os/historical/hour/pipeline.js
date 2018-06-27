'use stric'

const path = require('path');

var cron = require('node-cron');

module.exports = {
 input: [
	{
		poll: {
			id: "input.os.historical.cradle",
			conn: [
				{
					scheme: 'cradle',
					host:'192.168.0.180',
					//host:'127.0.0.1',
					port: 5984 ,
					db: 'dashboard',
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
				// periodical: 1200000,
				//periodical: 2000,//test
        periodical: function(dispatch){
					return cron.schedule('19,39,59 * * * *', dispatch);//every 20 min
				}
			},
		},
	}
 ],
 filters: [
		require('./snippets/filter.os.historical.hour.template'),
		require('./snippets/filter.sanitize.template'),
	],
	output: [
		//require('./snippets/output.stdout.template'),
		{
			cradle: {
				id: "output.os.historical.cradle",
				conn: [
					{
						//host: '127.0.0.1',
						host: '192.168.0.180',
						port: 5984,
						db: 'dashboard',
						opts: {
							cache: true,
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
