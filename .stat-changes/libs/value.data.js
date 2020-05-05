'use strict'

// let ss = require('simple-statistics')
const stat = require('../libs/stat')

module.exports = function(value, sampling){

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
		// let data_values = Object.values(val);
		// let min = ss.min(data_values);
		// let max = ss.max(data_values);
		//
		// let data = {
		// 	min : min,
		// 	max : max,
		// 	mean : ss.mean(data_values),
		// 	median : ss.median(data_values),
		// 	mode : ss.mode(data_values),
		// 	range: max - min,
		// };

		let data = stat(val)
		if(sampling && sampling == true)
			data.samples = val


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
