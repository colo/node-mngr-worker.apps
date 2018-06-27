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
					load: ['apps/os/historical/minute/']
				}
			],
			requests: {
				/**
				 * runnign at 15 secs intervals
				 * needs 4 runs to start analyzing from last historical (or from begining)
				 * it takes 60 secs to complete, so it makes historical each minute
				 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
				 * */
				// periodical: function(dispatch){
				// 	return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
				// }
				//periodical: 20000,
				periodical: 1000,//test
			},

		},
	}
 ],
 filters: [
		require('./filter'),
		// require('./snippets/filter.sanitize.template'),
    sanitize = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
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
