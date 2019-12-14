var debug = require('debug')('filter:os-mounts');
var debug_internals = require('debug')('filter:os-mounts:Internals');

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

		if(
			val !== null
		){

			Array.each(val, function(_doc){
				let mount_point = _doc.mount_point
				let used = {
					percentage: _doc.percentage *1
				}

				let blocks = {
					availabe : _doc.availabe *1,
					total : _doc.bloks *1,
					used : _doc.used *1
				}

				let info = {
					fs: _doc.fs,
					type: _doc.type
				}

				next({data: blocks, metadata: {host: host, path: module+'.['+mount_point+'].blocks', tag: ['os', 'mounts', mount_point, 'blocks'].combine(Object.values(info).combine(Object.keys(blocks)))}})
				next({data: used, metadata: {host: host, path: module+'.['+mount_point+'].used', tag: ['os', 'mounts', mount_point, 'used', 'percentage'].combine(Object.values(info))}})

				// if(_doc.stats){
				// 	Object.each(_doc.stats, function(value, prop){
				// 		_doc.stats[prop] = value * 1
				// 	})
				// 	next({data: _doc.stats, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc.stats))}})
				// }

				/**
				* @todo - move to "info" docs
				**/

				// if(_doc.size && _doc.blockSize){
				// 	next({data: {size: _doc.size, blockSize: _doc.blockSize}, metadata: {host: host, path: module+'.'+device+'.info', tag: ['os', 'blockdevices', device, 'blockSize', 'size']}})
				// }
			})

			// next(networkInterfaces_doc, opts, next, pipeline)

		}//if


}
