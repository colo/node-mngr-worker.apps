var debug = require('debug')('filter:os-stats');
var debug_internals = require('debug')('filter:os-stats:Internals');

os_mounts_type_filter = /ext.*/

/**
 * recives an array of OS docs and does some statictics
 *
 **/
module.exports = function(doc, opts, next){

	var ss = require('simple-statistics');

	// //debug_internals('os-stats filter doc %o', doc);
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
				let data = d.doc.data;
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
							debug_internals('networkInterfaces %o',value)
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
						else if (path == 'os.mounts' || path == 'os.blockdevices') {

							let mount = {}

							// //console.log('os.mounts', value)

							Object.each(value, function(sample, timestamp){
								Object.each(sample, function(val, prop){
									if(!mount[prop]) mount[prop] = {};
										// mount[prop] = [];

									// mount[prop].push(val)
									mount[prop][timestamp] = val
								});
							});

							let mount_data = {}
							Object.each(mount, function(val, key){//user,nice..etc
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

								mount_data[key] = data;
							});

							new_doc['data'][key] = Object.clone(mount_data)

							// //debug_internals('os.mounts data %s %o', key, new_doc['data'][key])
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
