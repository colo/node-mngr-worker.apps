var debug = require('debug')('filter:os-mounts');
var debug_internals = require('debug')('filter:os-mounts:Internals');

let conf = require('../etc/mounts')()
// const type_filter = /^ext|^xfs/

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id
	let module = app.options.id

		if(
			val !== null
		){

			let used_doc_data = {}
			let used_doc_data_info = {}
			Array.each(val, function(_doc){

				if(
					((conf.type_filter && conf.type_filter.test(_doc.type)) || !conf.type_filter)
					&& ((conf.mount_filter && conf.mount_filter.test(_doc.mount_point)) || !conf.mount_filter)
				){
					let mount_point = _doc.mount_point
					// let used = {
					// 	percentage: _doc.percentage *1
					// }

					let blocks = {
						availabe : _doc.availabe *1,
						total : _doc.bloks *1,
						used : _doc.used *1
					}

					let info = {
						fs: _doc.fs,
						type: _doc.type
					}

					/**
					* one doc per mount for blocks
					**/
					next({data: blocks, metadata: {host: host, path: module+'.['+mount_point+'].blocks', tag: ['os', 'mounts', mount_point, 'blocks'].combine(Object.values(info).combine(Object.keys(blocks)))}})

					/**
					* moved to one doc for all mount points percentage
					**/
					// next({data: used, metadata: {host: host, path: module+'.['+mount_point+'].used', tag: ['os', 'mounts', mount_point, 'used', 'percentage'].combine(Object.values(info))}})
					used_doc_data[mount_point] = _doc.percentage *1
					used_doc_data_info = Object.merge(used_doc_data_info, info)
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
				}
			})

			if(Object.getLength(used_doc_data) > 0){
				next({data: used_doc_data, metadata: {host: host, path: module+'.used', tag: ['os', 'mounts', 'used', 'percentage'].combine(Object.values(used_doc_data_info)).combine(Object.values(used_doc_data))}})
			}

			// next(networkInterfaces_doc, opts, next, pipeline)

		}//if


}
