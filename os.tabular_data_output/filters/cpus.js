var debug = require('debug')('filter:os-cpus');
var debug_internals = require('debug')('filter:os-cpus:Internals');

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

		if(
			val !== null
		){

			let cpus_merged = {}
			Array.each(val, function(_doc, index){

				if(_doc.times){
					Object.each(_doc.times, function(value, prop){
						_doc.times[prop] = value * 1
						if(!cpus_merged[prop]) cpus_merged[prop] = 0
						cpus_merged[prop] +=  _doc.times[prop]
					})

				}

				next({data: _doc.times, metadata: {host: host, path: module+'.cpus.'+index, tag: ['os', 'cpus'].combine(Object.keys(_doc.times))}})


				/**
				* @todo - move to "info" docs
				**/
				// if(_doc.model && _doc.speed){
				// }
			})

			next({data: cpus_merged, metadata: {host: host, path: module+'.cpus', tag: ['os', 'cpus'].combine(Object.keys(cpus_merged))}})

			/**
			* @todo - move to "info" docs
			**/
			// 	next({data: {size: _doc.size, blockSize: _doc.blockSize}, metadata: {host: host, path: module+'.'+device+'.info', tag: ['os', 'blockdevices', device, 'blockSize', 'size']}})

		}//if


}
