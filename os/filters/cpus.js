var debug = require('debug')('filter:os-cpus');
var debug_internals = require('debug')('filter:os-cpus:Internals');

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

		if(
			val !== null
		){

			let cpus = []
			Array.each(val, function(_doc, cpu){
				if(_doc.times){
					Object.each(_doc.times, function(value, prop){
						_doc.times[prop] = value * 1
					})

				}

				cpus.push(_doc.times)
				/**
				* @todo - move to "info" docs
				**/
				// if(_doc.model && _doc.speed){
				// }
			})

			next({data: cpus, metadata: {host: host, path: module+'.cpus', tag: ['os', 'cpus'].combine(Object.keys(cpus[0]))}})

			/**
			* @todo - move to "info" docs
			**/
			// 	next({data: {size: _doc.size, blockSize: _doc.blockSize}, metadata: {host: host, path: module+'.'+device+'.info', tag: ['os', 'blockdevices', device, 'blockSize', 'size']}})

		}//if


}
