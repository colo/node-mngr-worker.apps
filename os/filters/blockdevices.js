var debug = require('debug')('filter:os-blockdevices');
var debug_internals = require('debug')('filter:os-blockdevices:Internals');

let conf = require('../etc/blockdevices')()

/**
stats_info: {
	read_ios: null,        //requests      number of read I/Os processed
	read_merges: null,     //requests      number of read I/Os merged with in-queue I/O
	read_sectors: null,    //sectors       number of sectors read
	read_ticks: null,      //milliseconds  total wait time for read requests
	write_ios: null,      	//requests      number of write I/Os processed
	write_merges: null,    //requests      number of write I/Os merged with in-queue I/O
	write_sectors: null,   //sectors       number of sectors written
	write_ticks: null,     //milliseconds  total wait time for write requests
	in_flight: null,       //requests      number of I/Os currently in flight
	io_ticks: null,        //milliseconds  total time this block device has been active
	time_in_queue: null,   //milliseconds  total wait time for all requests
	discard_ios: null, 			//requests      number of discard I/Os processed
	discard_merges: null, 	//requests      number of discard I/Os merged with in-queue I/O
	discard_sectors: null, 	//sectors       number of sectors discarded
	discard_ticks: null			//milliseconds  total wait time for discard requests

},
**/
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
					let requests = {
						read_ios: _doc.stats.read_ios,
						read_merges: _doc.stats.read_merges,
						write_ios: _doc.stats.write_ios,
						write_merges: _doc.stats.write_merges,
						discard_ios: _doc.stats.discard_ios,
						discard_merges: _doc.stats.discard_merges
					}
					let time = {
						read_ticks: _doc.stats.read_ticks,
						write_ticks: _doc.stats.write_ticks,
						time_in_queue: _doc.stats.time_in_queue,
						discard_ticks: _doc.stats.discard_ticks
					}
					let sectors = {
						read_sectors: _doc.stats.read_sectors,
						write_sectors: _doc.stats.write_sectors,
						discard_sectors: _doc.stats.discard_sectors
					}

					next({data: requests, metadata: {host: host, path: module+'.'+device+'.requests', tag: ['os', 'blockdevices', device, 'requests'].combine(Object.keys(requests))}})
					next({data: time, metadata: {host: host, path: module+'.'+device+'.time', tag: ['os', 'blockdevices', device, 'time'].combine(Object.keys(time))}})
					next({data: sectors, metadata: {host: host, path: module+'.'+device+'.sectors', tag: ['os', 'blockdevices', device, 'sectors'].combine(Object.keys(sectors))}})

					// next({data: _doc.stats, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc.stats))}})
				}

				/**
				* @todo - move to "info" docs
				**/
				// if(_doc.size && _doc.blockSize){
				// 	next({data: {size: _doc.size, blockSize: _doc.blockSize}, metadata: {host: host, path: module+'.'+device+'.info', tag: ['os', 'blockdevices', device, 'blockSize', 'size']}})
				// }
			}
			Object.each(val, function(_doc, device){
				if(conf.per_device === true)
					process_device(_doc, device)

				if(_doc.partitions && conf.per_partition === true){
					Object.each(_doc.partitions, function(data, partition){
						process_device(data, partition)
					})
				}
			})

			// next(networkInterfaces_doc, opts, next, pipeline)

		}//if


}
