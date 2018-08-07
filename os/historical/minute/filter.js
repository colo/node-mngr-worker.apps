var debug = require('debug')('filter:os-stats');
var debug_internals = require('debug')('filter:os-stats:Internals');
var ss = require('simple-statistics');

os_mounts_type_filter = /ext.*/

// var lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.decompress'))
// var decompress = require('lz-string').decompress
// var decompress = require('lzutf8').decompress
// var decompress = require('zipson').parse;

var value_to_data = function(value){

	let obj = {}

	/**
	* may include keys starting with '_' (let's call'em hidden keys),
	* wich are not processed for stats
	*/

	Object.each(value, function(sample, timestamp){
		Object.each(sample, function(val, prop){

			if(prop.indexOf('_') != 0){
				if(!obj[prop]) obj[prop] = {};
				obj[prop][timestamp] = val
			}

		});
	});

	let obj_data = {}
	Object.each(obj, function(val, prop){//user,nice..etc
		let data_values = Object.values(val);
		let min = ss.min(data_values);
		let max = ss.max(data_values);

		let data = {
			samples: val,
			min : min,
			max : max,
			mean : ss.mean(data_values),
			median : ss.median(data_values),
			mode : ss.mode(data_values),
			range: max - min,
		};

		obj_data[prop] = data;
	});

	/**
	* add the "hidden" keys
	*/
	Object.each(value, function(sample, timestamp){
		Object.each(sample, function(val, prop){

			if(prop.indexOf('_') == 0){
				if(!obj_data[prop]) obj_data[prop] = val
			}

		});
	});

	return obj_data
}


/**
 * recives an array of OS docs and does some statictics
 *
 **/
module.exports = function(doc, opts, next){

	// debug_internals('os-stats filter doc %o', doc);
	// //debug_internals('os-stats filter length %o', doc.length);
	// //debug_internals('os-stats filter->next %o', next);
	try{
		if(
				typeof(doc) == 'array'
				|| doc instanceof Array
				|| Array.isArray(doc)
				&& doc.length > 0 && doc[0].doc && doc[0].doc !== null
				&& doc[doc.length - 1] && doc[doc.length - 1].doc && doc[doc.length - 1].doc !== null
			){
			let first = doc[0].doc.metadata.timestamp;
			let last = doc[doc.length - 1].doc.metadata.timestamp;

			let values = {};
			let networkInterfaces = {} //temp obj to save data

			Array.each(doc, function(d){
				// let data = JSON.decode(decompress(d.doc.data, {inputEncoding: "Base64"}))
				// let data = decompress(d.doc.data)
				// debug_internals('decompressed ', data)
				let data = d.doc.data

				let timestamp = d.doc.metadata.timestamp;
				let path = d.key[0];
				let host = d.key[1];

				if(!values[host]) values[host] = {};

				if(!values[host][path]) values[host][path] = {};

				// //debug_internals('os-stats filter get HOST %o', d.key[1], d.key[0]);

				Object.each(data, function(value, key){
					// if(key != 'networkInterfaces' && key != 'totalmem'){
					if(key != 'totalmem'){

						// //debug_internals('os.mounts %o', host, path, key)

						// if(!values[host][path][key]) values[host][path][key] = [];
						if(!values[host][path][key] && key == 'cpus'){
							values[host][path][key] = [];
						}
						else if(!values[host][path][key]){
							values[host][path][key] = {};
							// values[host][key] = [];
						}

						if(key == 'cpus' ){
							Array.each(value, function(cpu, core){
								if(!values[host][path][key][core]) values[host][path][key][core] = {};
									// values[host][path][key][core] = [];

								let data = {};
								data = {
									speed: cpu.speed,
									times: cpu.times
								};

								// //debug_internals('os-stats filter core %d', core);
								// values[host][path][key][core].push(data);
								values[host][path][key][core][timestamp] = data
							});//iterate on each core
						}
						else if(key == 'loadavg'){//keep only "last minute" value
							// values[host][path][key].push(value[0]);
							values[host][path][key][timestamp] = value[0];
						}
						else if (key == 'networkInterfaces' ) {
							delete values[host][path][key]

							if(!networkInterfaces[host]) networkInterfaces[host] = {};

							Object.each(value, function(data, iface){
								if(!networkInterfaces[host][iface]) networkInterfaces[host][iface] = {}

								Object.each(data, function(val, status){//status => if | recived | transmited
									if(status == 'recived' || status == 'transmited'){
										Object.each(val, function(prop_val, prop){
											if(!networkInterfaces[host][iface][prop])
												networkInterfaces[host][iface][prop] = {}

											if(!networkInterfaces[host][iface][prop][status])
												networkInterfaces[host][iface][prop][status] = {}

											networkInterfaces[host][iface][prop][status][timestamp] = prop_val
										})
									}
								})
							})

							// debug_internals('networkInterfaces %o',networkInterfaces[host])
						}
						else if (path == 'os.blockdevices') {//keep only stats, partitions may be done in the future
							// delete values[host][path][key]
							// values[host][path][key].push(value.stats);
							// values[host][path][key][timestamp] = value.stats
							if(!values[host][path][key][timestamp]) values[host][path][key][timestamp] = {}
							Object.each(value.stats, function(val, prop){
								values[host][path][key][timestamp][prop] = val * 1
							})
							//debug_internals('os.blockdevices %o',values[host][path][key][timestamp])
						}
						else if (path == 'os.mounts') {//keep only stats, partitions may be done in the future
							// values[host][path][key].push(value.stats);

							delete values[host][path][key]//remove numerical key, gonna change it for DEVICE

							if(os_mounts_type_filter.test(value.type)){
								// //debug_internals('os.mounts %o', value)

								let key = value.fs.replace('/dev/', '')

								if(!values[host][path][key]) values[host][path][key] = {}
									// values[host][path][key] = []

								let data = {};

								//value * 1 - type cast string -> int
								data = {
									bloks: value.bloks * 1,
									used: value.used * 1,
									availabe: value.availabe * 1,
									percentage: value.percentage * 1
								}

								// values[host][path][key].push(data);
								values[host][path][key][timestamp] = data;
							}
							// else{
	            //
							// }


						}
						else if (path == 'os.procs') {
							// delete values[host][path][key]

							if(key == 'pids'){//stats only for 'pids' key...'uid' sorted is avoided
								Object.each(value, function(proc, pid){

									let prop = pid+':'+proc['ppid']+':'+proc['cmd'] //pid + ppid + command

									if(!values[host][path][key][prop]) values[host][path][key][prop] = {}

									let data = {
										// '_pid': proc['pid'],
										// '_ppid': proc['ppid'],
										// '_command': proc['_command'],
										'%cpu': proc['%cpu'],
										'%mem': proc['%mem'],
										'rss': proc['rss'],
										'vsize': proc['vsize']
										// 'time':
									}

									values[host][path][key][prop][timestamp] = data

								})
							}
							else{//prop = uids || cmd
								Object.each(value, function(data, prop){
									if(!values[host][path][key][prop]) values[host][path][key][prop] = {}
									values[host][path][key][prop][timestamp] = data
								})

							}




							// if(!values[host][path+'.uid']) values[host][path+'.uid'] = {}
							// if(!values[host][path+'.uid'][value['uid']]) values[host][path+'.uid'][value['uid']] = {}
              //
							// let uid_data = {
							// 	'%cpu': value['%cpu'],
							// 	'%mem': value['%mem']
							// 	// 'time':
							// }
              //
							// values[host][path+'.uid'][value['uid']][timestamp] = uid_data

							// debug_internals('procs %o',values)
						}
						// else if (path == 'os.procs:uid') {
						// 	// delete values[host][path][key]
            //
						// 	debug_internals('procs:uid %o',value)
						// }
						else{

							// values[host][path][key].push(value);
							values[host][path][key][timestamp] = value;

						}

					}


				});
			});

			if(Object.keys(networkInterfaces).length > 0){
				Object.each(networkInterfaces, function(data, host){
					if(!values[host]['os']['networkInterfaces']) values[host]['os']['networkInterfaces'] = {}

					Object.each(data, function(iface_data, iface){
						if(!values[host]['os']['networkInterfaces'][iface]) values[host]['os']['networkInterfaces'][iface] = {}

						Object.each(iface_data, function(prop_data, prop){
							if(!values[host]['os']['networkInterfaces'][iface][prop])
								values[host]['os']['networkInterfaces'][iface][prop] = {}

							Object.each(prop_data, function(status_data, status){
								if(!values[host]['os']['networkInterfaces'][iface][prop][status])
									values[host]['os']['networkInterfaces'][iface][prop][status] = {}

								let counter = 0
								let prev = null
								Object.each(status_data, function(value, timestamp){
									if(counter == 0){
										prev = value
									}
									else{
										values[host]['os']['networkInterfaces'][iface][prop][status][timestamp] = value - prev
										prev = value
									}
									counter++
								})
							})
						})
					})

					// debug_internals('networkInterfaces %o',values[host]['os']['networkInterfaces'])

				})
			}


			// debug_internals('values %o',values)

			Object.each(values, function(host_data, host){

				let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};

				Object.each(host_data, function(data, path){

					Object.each(data, function(value, key){

						//debug_internals('os-stats filter value %o', key, value);

						if(key == 'cpus' ){
							let speed = {};
							let times = {};
							Array.each(value, function(sample){

								// Array.each(sample, function(cpu, core){
								Object.each(sample, function(cpu, timestamp){

									// speed.push(cpu.speed);
									speed[timestamp] = cpu.speed

									let sample_time = {};
									Object.each(cpu.times, function(time, key){//user,nice..etc
										if(!times[key]) times[key] = {};
											// times[key] = [];

										// times[key].push(time);
										times[key][timestamp] = time;

									});

								});

							});

							Object.each(times, function(time, key){//user,nice..etc
								let data_values = Object.values(time);

								let min = ss.min(data_values);
								let max = ss.max(data_values);

								let data = {
									samples: time,
									min : ss.min(data_values),
									max : ss.max(data_values),
									mean : ss.mean(data_values),
									median : ss.median(data_values),
									mode : ss.mode(data_values),
									range: max - min,
								};

								times[key] = data;
							});

							////console.log('SPEED', speed)
							let data_values = Object.values(speed);

							let min = ss.min(data_values);
							let max = ss.max(data_values);

							new_doc['data'][key] = {
								//samples: value,
								speed: {
									samples: speed,
									min : ss.min(data_values),
									max : ss.max(data_values),
									mean : ss.mean(data_values),
									median : ss.median(data_values),
									mode : ss.mode(data_values),
									range: max - min,
								},
								times: times
							};
						}
						else if(key == 'networkInterfaces' ){
							// debug_internals('networkInterfaces %o',value)
							let networkInterfaces = {}
							Object.each(value, function(iface_data, iface){
								if(!networkInterfaces[iface]) networkInterfaces[iface] = {}

								Object.each(iface_data, function(prop_data, prop){
									if(!networkInterfaces[iface][prop]) networkInterfaces[iface][prop] = {}

									Object.each(prop_data, function(status_data, status){
										if(!networkInterfaces[iface][prop][status]) networkInterfaces[iface][prop][status] = {}

										let data_values = Object.values(status_data);
										let min = ss.min(data_values);
										let max = ss.max(data_values);

										let data = {
											samples: status_data,
											min : min,
											max : max,
											mean : ss.mean(data_values),
											median : ss.median(data_values),
											mode : ss.mode(data_values),
											range: max - min,
										};

										networkInterfaces[iface][prop][status] = data

									})
								})
							})

							new_doc['data'][key] = Object.clone(networkInterfaces)

						}
						else if (path == 'os.procs'){

							// debug_internals('os.procs prop %s %o', key, value)

							Object.each(value, function(val, prop){
								// debug_internals('os.procs prop %s %o', prop, val)

								let obj_data = value_to_data(val)

								if(!new_doc['data'][key]) new_doc['data'][key] = {}

								new_doc['data'][key][prop] = Object.clone(obj_data)

							})

						}
						else if (
							path == 'os.mounts'
							|| path == 'os.blockdevices'
							// || path == 'os.procs'
						) {

							// if (path == 'os.procs')
							// 	debug_internals('os.procs data %s %o', key, value)

							let obj_data = value_to_data(value)

							new_doc['data'][key] = Object.clone(obj_data)

							// if (path == 'os.procs')
	            	// debug_internals('os.procs data %s %o', key, new_doc['data'][key])
						}
						else{
							let data_values = Object.values(value);
							let min = ss.min(data_values);
							let max = ss.max(data_values);

							new_doc['data'][key] = {
								samples : value,
								min : min,
								max : max,
								mean : ss.mean(data_values),
								median : ss.median(data_values),
								mode : ss.mode(data_values),
								range: max - min
							};
						}

						// let historical_path = 'os.historical'
	          //
						// if(path != 'os')
						// 	historical_path = historical_path+'.'+path.replace('os.', '')

						new_doc['metadata'] = {
							type: 'minute',
							host: host,
							path: 'historical.'+path,
							range: {
								start: first,
								end: last
							}
						};



					});

					next(new_doc, opts);

				})
			});



		}//if
	}
	catch(e){
		console.log(doc)
		throw e
	}

};
