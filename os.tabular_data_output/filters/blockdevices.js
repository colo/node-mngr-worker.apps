var debug = require('debug')('filter:os-blockdevices');
var debug_internals = require('debug')('filter:os-blockdevices:Internals');

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

		if(
			val !== null
		){

			const process_device = function(_doc, device){
				if(_doc.stats){
					Object.each(_doc.stats, function(value, prop){
						_doc.stats[prop] = value * 1
					})
					next({data: _doc.stats, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc.stats))}})
				}

				/**
				* @todo - move to "info" docs
				**/
				// if(_doc.size && _doc.blockSize){
				// 	next({data: {size: _doc.size, blockSize: _doc.blockSize}, metadata: {host: host, path: module+'.'+device+'.info', tag: ['os', 'blockdevices', device, 'blockSize', 'size']}})
				// }
			}
			Object.each(val, function(_doc, device){
				process_device(_doc, device)

				if(_doc.partitions){
					Object.each(_doc.partitions, function(data, partition){
						process_device(data, partition)
					})
				}
			})

			// next(networkInterfaces_doc, opts, next, pipeline)

		}//if


}
