var debug = require('debug')('filter:os-hour-stats');
var debug_internals = require('debug')('filter:os-hour-stats:Internals');

/**
 * recives an array of OS docs and does some statictics on freemem
 *
 **/
module.exports = function(doc, opts, next){

	var ss = require('simple-statistics');

	//debug_internals('os-hour-stats filter doc %o', doc);
	//debug_internals('os-hour-stats filter length %o', doc.length);
	////debug_internals('os-hour-stats filter->next %o', next);

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
		Array.each(doc, function(row){
			// let metadata = row.doc.metadata;
			let timestamp = row.doc.metadata.timestamp;
			let data = row.doc.data;
			let path = row.key[0];
			let host = row.key[1];

			////debug_internals('os-hour-stats filter row %s - %o', host, data);

			if(!values[host]) values[host] = {};

			if(!values[host][path]) values[host][path] = {};

			Object.each(data, function(value, key){
				//if(key != 'networkInterfaces' && key != 'totalmem'){
					// if(!values[host][key]) values[host][key] = [];
					// if(!values[host][path][key] && key == 'cpus'){
					// 	values[host][path][key] = {};
					// }
					// else

					if(!values[host][path][key]) values[host][path][key] = {}

					// }

					if(key == 'cpus' ){

						Object.each(value, function(cpu_value, cpu_key){
							if(!values[host][path][key][cpu_key]) values[host][path][key][cpu_key] = {};

							if(cpu_key == 'times'){
								Object.each(cpu_value, function(times_value, times_key){

									if(!values[host][path][key][cpu_key][times_key])
										values[host][path][key][cpu_key][times_key] = {}

									// values[host][path][key][cpu_key][times_key].push(times_value['mean']);
									values[host][path][key][cpu_key][times_key][timestamp] = times_value['mean']

								});
							}
							else{
								// values[host][path][key][cpu_key].push(cpu_value['mean']);
								values[host][path][key][cpu_key][timestamp] = cpu_value['mean']
							}

						});//iterate on each core
					}
					else if(key == 'networkInterfaces' ){
						Object.each(value, function(iface_value, iface){
							if(!values[host][path][key][iface]) values[host][path][key][iface] = {}

							Object.each(iface_value, function(prop_value, prop){
								if(!values[host][path][key][iface][prop]) values[host][path][key][iface][prop] = {}

								Object.each(prop_value, function(status_value, status){
									if(!values[host][path][key][iface][prop][status]) values[host][path][key][iface][prop][status] = {}

									values[host][path][key][iface][prop][status][timestamp] = status_value['mean']

								})

							})

						})
					}
					else if(!value['mean']){//os.blockdevices / os.mounts...
						//debug_internals('NO MEAN %s %s', path, key);

						Object.each(value, function(internal_value, internal_key){
							if(!values[host][path][key][internal_key]) values[host][path][key][internal_key] = {}
								values[host][path][key][internal_key][timestamp] = internal_value['mean']
						})
					}
					else{
						//values[host][path][key].append(value['samples']);
						// values[host][path][key].push(value['mean']);
						values[host][path][key][timestamp] = value['mean']
					}

				//}


			});
		});

		//debug_internals('values %O', values);
		// throw new Error()

		Object.each(values, function(host_data, host){
			let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};

			Object.each(host_data, function(data, path){

				Object.each(data, function(value, key){

					//debug_internals('os-hour-stats filter value %O %s', value, path);

					// throw new Error()

					if(key == 'cpus' ){

						let speed = {};
						let times = {};

						Object.each(value, function(cpu_value, cpu_key){
							if(cpu_key == 'times'){
								Object.each(cpu_value, function(times_value, times_key){
									if(!times[times_key]) times[times_key] = {};

									let data_values = Object.values(times_value);

									let min = ss.min(data_values);
									let max = ss.max(data_values);

									times[times_key] = {
										samples: times_value,
										min : min,
										max : max,
										mean : ss.mean(data_values),
										median : ss.median(data_values),
										mode : ss.mode(data_values),
										range: max - min,
									};
								});
							}
							else{
								let data_values = Object.values(cpu_value);

								let min = ss.min(data_values);
								let max = ss.max(data_values);

								speed = {
									samples: cpu_value,
									min : min,
									max : max,
									mean : ss.mean(data_values),
									median : ss.median(data_values),
									mode : ss.mode(data_values),
									range: max - min,
								};
							}
						});


						new_doc['data'][key] = {
							//samples: value,
							speed: speed,
							times: times
						};
					}
					// else if (path.indexOf('os.mounts') > -1 || path.indexOf('os.blockdevices') > -1) {
					// 	//debug_internals('os-hour-stats filter value %O', value);
					// 	throw new Error()
					// }
					else if(key == 'networkInterfaces' ){
						debug_internals('networkInterfaces %O', value);

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
					else{
						let num_key = Object.keys(value)[0] * 1

						if(isNaN(num_key)){//compex Object lie blockdevices (key is not timestamp)
							// let obj = {}

							//debug_internals('os-hour-stats NOT num_key %o', value);

							// Object.each(value, function(data, prop){
							// 	Object.each(data, function(sample, timestamp){
							// 		if(!obj[prop]) obj[prop] = {};
							// 			// mount[prop] = [];
              //
							// 		// mount[prop].push(val)
							// 		obj[prop][timestamp] = val
							// 	});
							// });

							let obj_data = {}
							Object.each(value, function(val, key){
								let data_values = Object.values(val);
								let min = ss.min(data_values);
								let max = ss.max(data_values);

								let data = {
									samples: val,
									min : ss.min(data_values),
									max : ss.max(data_values),
									mean : ss.mean(data_values),
									median : ss.median(data_values),
									mode : ss.mode(data_values),
									range: max - min,
								};

								obj_data[key] = data;
							});

							new_doc['data'][key] = Object.clone(obj_data)

						}
						else{//simple like loadavg{ timestamp: value }
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
								range: max - min,
							};
						}


					}

					new_doc['metadata'] = {
						type: 'hour',
						host: host,
						path: path,
						range: {
							start: first,
							end: last
						}
					};


					// new_doc['metadata'] = {
					// 	type: 'hour',
					// 	host: host,
					// 	range: {
					// 		start: first,
					// 		end: last
					// 	}
					// };


				});//each->data

			})//each->host_data
			// //debug_internals('os-hour-stats filter value %o', new_doc);

			//throw new Error();
			next(new_doc, opts);

		});//each->values



	}

};
