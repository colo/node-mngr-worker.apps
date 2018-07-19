var debug = require('debug')('filter:os-procs');
var debug_internals = require('debug')('filter:os-procs:Internals');


module.exports = function(doc, opts, next, pipeline){

	// var ss = require('simple-statistics');

	try{
		if(
			doc !== null
			&& doc.data
		){

			// let per_uid = {
			// 	data: {},
			// }

			let per_uid = {}

			let procs = {}

			Array.each(doc.data, function(proc){
				// let command = proc.command[0]

				/**
				* convert time to seconds
				**/
				let time = proc['time']
				let dd = (time.indexOf('-') > -1) ? time.substring(0, time.indexOf('-')) * 1 : 0

				//remove days
				time = (time.indexOf('-') > -1) ? time.substring(time.indexOf('-') + 1, time.length - 1) : time

				let hs =  time.split(':')[0] * 1
				let mm =  time.split(':')[1] * 1
				let ss =  time.split(':')[2] * 1
				/** **/


				Object.each(proc, function(val, prop){
					if(!isNaN(val * 1)) proc[prop] = val * 1 //type cast to number
				})
				proc['time'] = ss + (mm * 60) + (hs * 3600) + (dd * 86400)

				if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }
				// if(!per_command[command]) per_command[command] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }

				per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				per_uid[proc.uid]['count'] += 1
				per_uid[proc.uid]['%cpu'] += proc['%cpu']
				per_uid[proc.uid]['%mem'] += proc['%mem']

				// per_command[command]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				// per_command[command]['count'] += 1
				// per_command[command]['%cpu'] += proc['%cpu'] * 1
				// per_command[command]['%mem'] += proc['%mem'] * 1



				// debug_internals('procs doc', per_uid)
				// doc_per_uid.data.push(per_uid)

				procs[proc.pid] = proc
			})
			// // doc_per_uid.data = per_uid
      //
			// // debug_internals('procs doc %o', doc_per_uid)
      //
			// let per_uid_opts_app = Object.clone(opts.app)
			// per_uid_opts_app.options.id += ':uid'
			// let { type, input, input_type, app } = opts

      //
			// next(
			// 	Object.clone(per_uid),
			// 	{
			// 		type: type,
			// 		input: input, input_type: input_type,
			// 		app: per_uid_opts_app
			// 	},
			// 	pipeline.output.bind(pipeline)
			// )

			let procs_doc = Object.clone(doc)
			delete procs_doc.data
			procs_doc.data = {pids: {}, uids: {}}
			procs_doc.data.pids = procs
			procs_doc.data.uids = per_uid

			// next(procs_doc, opts, pipeline.output.bind(pipeline))
			next(procs_doc, opts, next, pipeline)


		}//if
	}
	catch(e){
		console.log(doc)
		throw e
	}



  // next(doc, opts, next, pipeline)
};
