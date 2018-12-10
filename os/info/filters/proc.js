var debug = require('debug')('filter:os-procs');
var debug_internals = require('debug')('filter:os-procs:Internals');

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/
module.exports = function(doc, opts, next, pipeline){
	try{
		if(
			doc !== null
			&& doc.data
		){

			let procs_re = /procs/
			// var ss = require('simple-statistics');

			if(!pipeline.procs) pipeline.procs = {}
			if(!pipeline.procs.buffer) pipeline.procs.buffer = [] //create a buffer for procs

			if(!pipeline.procs.buffer_size){
				Array.each(pipeline.inputs, function(input){

					if(procs_re.test(input.options.id)){
						// debug_internals ('input.poll.requests.periodical', input.options)
						pipeline.procs.buffer_size = Math.floor(1000 / input.options.requests.periodical)
					}
				})
			}

			// debug_internals ('input.poll.requests.periodical', pipeline.procs.buffer_size)

			pipeline.procs.buffer.push(doc)


			if(pipeline.procs.buffer.length >= pipeline.procs.buffer_size ){
				let procs = {}

				Array.each(pipeline.procs.buffer, function(doc){
					let matched_proc_counter = 0
					// Array.each(doc.data, function(proc){
					Object.each(doc.data, function(proc, pid){
						if(
							!procs[pid]
							|| ( procs[pid].ppid == proc.ppid
								&& procs[pid].uid == proc.uid
								&& procs[pid].cmd == proc.cmd
							)
						){//if procs match
							procs[pid] = proc

						}
						else{
							matched_proc_counter++
							procs[pid+'.'+matched_proc_counter] = proc
						}

					})
				})

				//save last doc as our "doc"
				let procs_doc = Object.clone(pipeline.procs.buffer[pipeline.procs.buffer.length - 1])
				pipeline.procs.buffer = []//clear buffer

				let per_uid = {}
				let per_cmd = {}

				// Array.each(doc.data, function(proc){
				Object.each(procs, function(proc){
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

					if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }
					if(!per_cmd[proc.cmd]) per_cmd[proc.cmd] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }

					per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
					per_uid[proc.uid]['count'] += 1
					per_uid[proc.uid]['%cpu'] += proc['%cpu']
					per_uid[proc.uid]['%mem'] += proc['%mem']
					per_uid[proc.uid]['rss'] += proc['rss']
					per_uid[proc.uid]['vsz'] += proc['vsz']

					per_cmd[proc.cmd]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
					per_cmd[proc.cmd]['count'] += 1
					per_cmd[proc.cmd]['%cpu'] += proc['%cpu']
					per_cmd[proc.cmd]['%mem'] += proc['%mem']
					per_cmd[proc.cmd]['rss'] += proc['rss']
					per_cmd[proc.cmd]['vsz'] += proc['vsz']



					// debug_internals('procs doc', per_uid)
					// doc_per_uid.data.push(per_uid)

					// procs[proc.pid] = proc
				})


				// delete procs_doc.data
				// procs_doc.data = {pids: {}, uids: {}, cmd: {}}
				// procs_doc.data.pids = procs
				// procs_doc.data.uids = per_uid
				// procs_doc.data.cmd = per_cmd
				// if(!procs_doc.metadata) procs_doc.metadata = {}
				// procs_doc.metadata.path = 'os.procs'
        //
				// next(procs_doc, opts, next, pipeline)

				delete procs_doc.data
				if(!procs_doc.metadata) procs_doc.metadata = {}

				let uids_doc = Object.clone(procs_doc)
				let cmds_doc = Object.clone(procs_doc)

				procs_doc.data = procs
				uids_doc.data = per_uid
				cmds_doc.data = per_cmd

				procs_doc.metadata.path = 'os.procs'
				uids_doc.metadata.path = 'os.procs.uid'
				cmds_doc.metadata.path = 'os.procs.cmd'



				procs_doc.data.cmd =

				next([procs_doc, uids_doc, cmds_doc], opts, next, pipeline)
			}


		}//if
	}
	catch(e){
		console.log(doc)
		throw e
	}

	// try{
	// 	if(
	// 		doc !== null
	// 		&& doc.data
	// 	){
  //
	// 		// let per_uid = {
	// 		// 	data: {},
	// 		// }
  //
	// 		let per_uid = {}
  //
	// 		let procs = {}
  //
	// 		Array.each(doc.data, function(proc){
	// 			// let command = proc.command[0]
  //
	// 			/**
	// 			* convert time to seconds
	// 			**/
	// 			let time = proc['time']
	// 			let dd = (time.indexOf('-') > -1) ? time.substring(0, time.indexOf('-')) * 1 : 0
  //
	// 			//remove days
	// 			time = (time.indexOf('-') > -1) ? time.substring(time.indexOf('-') + 1, time.length - 1) : time
  //
	// 			let hs =  time.split(':')[0] * 1
	// 			let mm =  time.split(':')[1] * 1
	// 			let ss =  time.split(':')[2] * 1
	// 			/** **/
  //
  //
	// 			Object.each(proc, function(val, prop){
	// 				if(!isNaN(val * 1)) proc[prop] = val * 1 //type cast to number
	// 			})
	// 			proc['time'] = ss + (mm * 60) + (hs * 3600) + (dd * 86400)
  //
	// 			if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }
	// 			// if(!per_command[command]) per_command[command] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }
  //
	// 			per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
	// 			per_uid[proc.uid]['count'] += 1
	// 			per_uid[proc.uid]['%cpu'] += proc['%cpu']
	// 			per_uid[proc.uid]['%mem'] += proc['%mem']
  //
	// 			// per_command[command]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
	// 			// per_command[command]['count'] += 1
	// 			// per_command[command]['%cpu'] += proc['%cpu'] * 1
	// 			// per_command[command]['%mem'] += proc['%mem'] * 1
  //
  //
  //
	// 			// debug_internals('procs doc', per_uid)
	// 			// doc_per_uid.data.push(per_uid)
  //
	// 			procs[proc.pid] = proc
	// 		})
	// 		// // doc_per_uid.data = per_uid
  //     //
	// 		// // debug_internals('procs doc %o', doc_per_uid)
  //     //
	// 		// let per_uid_opts_app = Object.clone(opts.app)
	// 		// per_uid_opts_app.options.id += ':uid'
	// 		// let { type, input, input_type, app } = opts
  //
  //     //
	// 		// next(
	// 		// 	Object.clone(per_uid),
	// 		// 	{
	// 		// 		type: type,
	// 		// 		input: input, input_type: input_type,
	// 		// 		app: per_uid_opts_app
	// 		// 	},
	// 		// 	pipeline.output.bind(pipeline)
	// 		// )
  //
	// 		let procs_doc = Object.clone(doc)
	// 		delete procs_doc.data
	// 		procs_doc.data = {pids: {}, uids: {}}
	// 		procs_doc.data.pids = procs
	// 		procs_doc.data.uids = per_uid
  //
	// 		// next(procs_doc, opts, pipeline.output.bind(pipeline))
	// 		next(procs_doc, opts, next, pipeline)
  //
  //
	// 	}//if
	// }
	// catch(e){
	// 	console.log(doc)
	// 	throw e
	// }



  // next(doc, opts, next, pipeline)
};
