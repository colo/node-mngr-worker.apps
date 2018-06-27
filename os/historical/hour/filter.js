var debug = require('debug')('filter:os-hour-stats');
var debug_internals = require('debug')('filter:os-hour-stats:Internals');

/**
 * recives an array of OS docs and does some statictics on freemem
 * 
 **/
module.exports = function(doc, opts, next){
						
	var ss = require('simple-statistics');
	
	debug_internals('os-hour-stats filter doc %o', doc);
	debug_internals('os-hour-stats filter length %o', doc.length);
	//debug_internals('os-hour-stats filter->next %o', next);
	
	if(typeof(doc) == 'array' || doc instanceof Array || Array.isArray(doc)){
		let first = doc[0].doc.metadata.timestamp;
		let last = doc[doc.length - 1].doc.metadata.timestamp;
		
		let values = {};
		Array.each(doc, function(row){
			
			let metadata = row.doc.metadata;
			let data = row.doc.data;
			let host = row.key[1];
			
			//debug_internals('os-hour-stats filter row %s - %o', host, data);
			
			if(!values[host]) values[host] = {};
			
			//debug_internals('os-hour-stats filter get HOST %o', row.key[1]);
			
			Object.each(data, function(value, key){
				//if(key != 'networkInterfaces' && key != 'totalmem'){
					if(!values[host][key]) values[host][key] = [];
					
					if(key == 'cpus' ){
						//Array.each(value['samples'], function(core_data, core){
							//if(!values[host][key][core]) values[host][key][core] = {};
							
							//Array.each(core_data, function(sample){//each "core_data" has an array of samples
								//if(!values[host][key][core]['speed']) values[host][key][core]['speed'] = [];
								//if(!values[host][key][core]['times']) values[host][key][core]['times'] = [];
								
								////let data = { speed: [], times: []};
								////data.speed.append(sample.speed);
								////data.times.append(sample.times);
								
								////debug_internals('os-hour-stats filter sample %o', values[host][key][core]['speed']);
								//values[host][key][core]['speed'].push(sample.speed);
								//values[host][key][core]['times'].push(sample.times);
								
							//});
							
							
						//});//iterate on each core
						Object.each(value, function(cpu_value, cpu_key){
							if(!values[host][key][cpu_key]) values[host][key][cpu_key] = [];
							
							//Array.each(core_data, function(sample){//each "core_data" has an array of samples
								//if(!values[host][key][core]['speed']) values[host][key][core]['speed'] = [];
								//if(!values[host][key][core]['times']) values[host][key][core]['times'] = [];
								
								////let data = { speed: [], times: []};
								////data.speed.append(sample.speed);
								////data.times.append(sample.times);
								
								////debug_internals('os-hour-stats filter sample %o', values[host][key][core]['speed']);
								//values[host][key][core]['speed'].push(sample.speed);
								//values[host][key][core]['times'].push(sample.times);
								
							//});
							if(cpu_key == 'times'){
								Object.each(cpu_value, function(times_value, times_key){
									
									if(!values[host][key][cpu_key][times_key]) values[host][key][cpu_key][times_key] = [];
									values[host][key][cpu_key][times_key].push(times_value['mean']);
									
								});
							}
							else{
								values[host][key][cpu_key].push(cpu_value['mean']);
							}
							
						});//iterate on each core
					}
					else{
						//values[host][key].append(value['samples']);
						values[host][key].push(value['mean']);
					}
					
				//}	
				
				
			});
		});
		
		debug_internals('values %o', values);
		//throw new Error();
		
		
		
		Object.each(values, function(data, host){
			let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};	
			
			Object.each(data, function(value, key){
				
				//debug_internals('os-hour-stats filter value %o', value);
				
				if(key == 'cpus' ){
					
					let speed = {};
					let times = {};
					
					Object.each(value, function(cpu_value, cpu_key){
						if(cpu_key == 'times'){
							Object.each(cpu_value, function(times_value, times_key){
								if(!times[times_key]) times[times_key] = {};
								
								let min = ss.min(times_value);
								let max = ss.max(times_value);
							
								times[times_key] = {
									samples: times_value,
									min : min,
									max : max,
									mean : ss.mean(times_value),
									median : ss.median(times_value),
									mode : ss.mode(times_value),
									range: max - min,
								};
							});
						}
						else{
							let min = ss.min(cpu_value);
							let max = ss.max(cpu_value);
							
							speed = {
								samples: cpu_value,
								min : min,
								max : max,
								mean : ss.mean(cpu_value),
								median : ss.median(cpu_value),
								mode : ss.mode(cpu_value),
								range: max - min,
							};
						}
					});
					
					//let speed = [];
					//let times = {};
					//Array.each(value, function(cpu, core){
						
						//speed.push(cpu.speed);
						
						//let sample_time = {};
						//Array.each(cpu.times, function(sample){
							//Object.each(sample, function(time, key){//user,nice..etc
								//if(!times[key]) times[key] = [];
								//times[key].push(time);
							//});
							
						//});
						
					//});
						
					
					
					////debug_internals('os-hour-stats filter times %o', times);
					
					//Object.each(times, function(time, key){//user,nice..etc
						//let data = {
							////samples: time,
							//min : ss.min(time),
							//max : ss.max(time),
							//mean : ss.mean(time),
							//median : ss.median(time),
						//};
						
						//times[key] = data;
					//});
					
					
					//Array.each(speed, function(cpu, core){//do the statictics
						//let data = {
							////samples: cpu,
							//min : ss.min(cpu),
							//max : ss.max(cpu),
							//mean : ss.mean(cpu),
							//median : ss.median(cpu),
						//};
						
						//speed[core] = data;
					//});
					
					////debug_internals('os-hour-stats filter speed %o', speed);
					
					new_doc['data'][key] = {
						//samples: value,
						speed: speed,
						times: times
					};
				}
				else{
					let min = ss.min(value);
					let max = ss.max(value);
						
					new_doc['data'][key] = {
						samples : value,
						min : min,
						max : max,
						mean : ss.mean(value),
						median : ss.median(value),
						mode : ss.mode(value),
						range: max - min,
					};
				}
				
				new_doc['metadata'] = {
					type: 'hour',
					host: host,
					range: {
						start: first,
						end: last
					}
				};
				
				
			});
			
			debug_internals('os-hour-stats filter value %o', new_doc);
			
			//throw new Error();
			next(new_doc, opts);
		});
		
		
		
	}
	
};
