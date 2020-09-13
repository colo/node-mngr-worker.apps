var debug = require('debug')('filter:host');
var debug_internals = require('debug')('filter:host:Internals');

// let conf = require('../etc/cpus')()

module.exports = function(doc, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id


	delete doc.loadavg
	delete doc.uptime
	delete doc.freemem
	if(doc.networkInterfaces){
		Object.each(doc.networkInterfaces, function(data, iface){
			delete data.recived
			delete data.transmited
		})
	}
	if(doc.cpus){
		Array.each(doc.cpus, function(data, core){
			delete data.times
		})
	}

	// debug('HOST %s', JSON.stringify(doc), opts)
	// process.exit(1)
	next(
		{
			data: doc,
			metadata: {
				host: host,
				path: 'host',
				tag: ['host', 'os'].combine(Object.keys(doc))
			}
		},
		opts,
		next,
		pipeline
	)


}
