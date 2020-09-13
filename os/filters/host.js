var debug = require('debug')('filter:host');
var debug_internals = require('debug')('filter:host:Internals');

// let conf = require('../etc/cpus')()

module.exports = function(doc, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

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
