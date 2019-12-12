var debug = require('debug')('Server:Apps:OS:Filter:Procs');
var debug_internals = require('debug')('Server:Apps:OS:Filter:Procs:Internals');

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/
module.exports = function(doc, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id

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
					proc['percentage_mem'] = proc['%mem']
					delete proc['%mem']

					proc['percentage_cpu'] = proc['%cpu']
					delete proc['%cpu']
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

					if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, 'percentage_cpu': 0, 'percentage_mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }
					if(!per_cmd[proc.cmd]) per_cmd[proc.cmd] = { count: 0, 'percentage_cpu': 0, 'percentage_mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }

					per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
					per_uid[proc.uid]['count'] += 1
					per_uid[proc.uid]['percentage_cpu'] += proc['percentage_cpu']
					per_uid[proc.uid]['percentage_mem'] += proc['percentage_mem']
					per_uid[proc.uid]['rss'] += proc['rss']
					per_uid[proc.uid]['vsz'] += proc['vsz']

					per_cmd[proc.cmd]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
					per_cmd[proc.cmd]['count'] += 1
					per_cmd[proc.cmd]['percentage_cpu'] += proc['percentage_cpu']
					per_cmd[proc.cmd]['percentage_mem'] += proc['percentage_mem']
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

				procs_doc.metadata.host = host

				let stats_doc = Object.clone(procs_doc)

				let uids_doc = Object.clone(procs_doc)
				let uids_stats_doc = Object.clone(procs_doc)

				let cmds_doc = Object.clone(procs_doc)
				let cmds_stats_doc = Object.clone(procs_doc)


				procs_doc.data = procs
				uids_doc.data = per_uid
				cmds_doc.data = per_cmd


				procs_doc.metadata.path = 'os.procs'
				procs_doc.metadata.tag = ['os', 'procs', 'pid', 'cmd', 'command', 'elapsed', 'cpu', 'mem', 'pid', 'ppid', 'rss', 'stat', 'time', 'uid', 'vsz']

				stats_doc.metadata.path = 'os.procs.stats'
				stats_doc.metadata.tag = ['os', 'procs', 'stats']

				uids_doc.metadata.path = 'os.procs.uid'
				uids_doc.metadata.tag = ['os', 'procs', 'uid', 'cpu', 'mem', 'rss', 'time', 'vsz']

				uids_stats_doc.metadata.path = 'os.procs.uid.stats'
				uids_stats_doc.metadata.tag = ['os', 'procs', 'ui', 'stats']

				cmds_doc.metadata.path = 'os.procs.cmd'
				cmds_doc.metadata.tag = ['os', 'procs', 'cmd', 'cpu', 'mem', 'rss', 'time', 'vsz']

				cmds_stats_doc.metadata.path = 'os.procs.cmd.stats'
				cmds_stats_doc.metadata.tag = ['os', 'procs', 'cmd', 'stats']

				// let by_cpu = []
				// let by_mem = []
				// let by_elapsed = []
				// let by_time = []
				let kernel_space = []
				let user_space = []

				let by_cpu = {}
				let by_mem = {}
				let by_time = {}
				let by_elapsed = {}
				// let by_count = {}
				Object.each(procs_doc.data, function(proc, pid){
					// by_cpu.push({pid: pid, 'percentage_cpu': proc['percentage_cpu'] })
					// by_mem.push({pid: pid, 'percentage_mem': proc['percentage_mem'] })
					// by_elapsed.push({pid: pid, 'elapsed': proc.elapsed })
					// by_time.push({pid: pid, 'time': proc.time })

					by_cpu[pid] = proc['percentage_cpu']
					by_mem[pid] = proc['percentage_mem']
					by_elapsed[pid] = proc.elapsed
					by_time[pid] = proc.time


					if(proc.command[0].indexOf('[') == 0 && proc.command[0].indexOf(']') == proc.command[0].length -1){
						kernel_space.push(proc.pid)
					}
					else{
						user_space.push(proc.pid)
					}
				})

				// by_cpu = by_cpu.sort(function(a,b) {return (a['percentage_cpu'] > b['percentage_cpu']) ? 1 : ((b['percentage_cpu'] > a['percentage_cpu']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_cpu'] > 0})
				//
				//
				// by_mem = by_mem.sort(function(a,b) {return (a['percentage_mem'] > b['percentage_mem']) ? 1 : ((b['percentage_mem'] > a['percentage_mem']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_mem'] > 0})
				//
				// by_elapsed = by_elapsed.sort(function(a,b) {return (a['elapsed'] > b['elapsed']) ? 1 : ((b['elapsed'] > a['elapsed']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['elapsed'] > 0})
				//
				// by_time = by_time.sort(function(a,b) {return (a['time'] > b['time']) ? 1 : ((b['time'] > a['time']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['time'] > 0})

				by_cpu = Object.filter(by_cpu, function(item, index){ return item > 0})

				by_mem = Object.filter(by_mem, function(item, index){ return item > 0})

				by_elapsed = Object.filter(by_elapsed, function(item, index){ return item > 0})

				by_time = Object.filter(by_time, function(item, index){ return item > 0})



				stats_doc.data = {
					pids_count: Object.keys(procs_doc.data).length,
					'percentage_cpu': by_cpu,
					'percentage_mem': by_mem,
					elapsed: by_elapsed,
					time: by_time,
					kernel: kernel_space,
					user: user_space
				}
				/**
				* bad, too many tags
				**/
				// stats_doc.metadata.tag.combine(Object.keys(stats_doc.data))

				next(procs_doc, opts, next, pipeline)
				// next(stats_doc, opts, next, pipeline)

				/**
				* UIDS
				**/
				by_cpu = {}
				by_mem = {}
				by_time = {}
				let by_count = {}
				Object.each(uids_doc.data, function(proc, uid){
					// by_cpu.push({uid: uid, 'percentage_cpu': proc['percentage_cpu'] })
					// by_mem.push({uid: uid, 'percentage_mem': proc['percentage_mem'] })
					// by_time.push({uid: uid, 'time': proc.time })
					// by_count.push({uid: uid, 'count': proc.count })
					by_cpu[uid] = proc['percentage_cpu']
					by_mem[uid] = proc['percentage_mem']
					by_time[uid] = proc.time
					by_count[uid] = proc.count
				})
				/**
				* bad, too many tags
				**/
				// uids_doc.metadata.tag.combine(Object.keys(uids_doc.data))

				// by_cpu = by_cpu.sort(function(a,b) {return (a['percentage_cpu'] > b['percentage_cpu']) ? 1 : ((b['percentage_cpu'] > a['percentage_cpu']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_cpu'] > 0})
				//
				// by_mem = by_mem.sort(function(a,b) {return (a['percentage_mem'] > b['percentage_mem']) ? 1 : ((b['percentage_mem'] > a['percentage_mem']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_mem'] > 0})
				//
				// by_time = by_time.sort(function(a,b) {return (a['time'] > b['time']) ? 1 : ((b['time'] > a['time']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['time'] > 0})
				//
				// by_count = by_count.sort(function(a,b) {return (a['count'] > b['count']) ? 1 : ((b['count'] > a['count']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['count'] > 0})

				by_cpu = Object.filter(by_cpu, function(item, index){ return item > 0})

				by_mem = Object.filter(by_mem, function(item, index){ return item > 0})

				by_time = Object.filter(by_time, function(item, index){ return item > 0})

				by_count = Object.filter(by_count, function(item, index){ return item > 0})

				uids_stats_doc.data = {
					uids_count: Object.keys(uids_doc.data).length,
					'percentage_cpu': by_cpu,
					'percentage_mem': by_mem,
					time: by_time,
					count: by_count,
				}
				/**
				* bad, too many tags
				**/
				// uids_stats_doc.metadata.tag.combine(Object.keys(uids_stats_doc.data))

				next(uids_doc, opts, next, pipeline)//was commented
				// next(uids_stats_doc, opts, next, pipeline)

				/**
				* CMDS
				**/
				by_cpu = {}
				by_mem = {}
				by_time = {}
				by_count = {}
				Object.each(cmds_doc.data, function(proc, cmd){
					// by_cpu.push({cmd: cmd, 'percentage_cpu': proc['percentage_cpu'] })
					// by_mem.push({cmd: cmd, 'percentage_mem': proc['percentage_mem'] })
					// by_time.push({cmd: cmd, 'time': proc.time })
					// by_count.push({cmd: cmd, 'count': proc.count })
					by_cpu[cmd] = proc['percentage_cpu']
					by_mem[cmd] = proc['percentage_mem']
					by_time[cmd] = proc.time
					by_count[cmd] = proc.count
				})
				/**
				* bad, too many tags
				**/
				// cmds_doc.metadata.tag.combine(Object.keys(cmds_doc.data))

				// by_cpu = by_cpu.sort(function(a,b) {return (a['percentage_cpu'] > b['percentage_cpu']) ? 1 : ((b['percentage_cpu'] > a['percentage_cpu']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_cpu'] > 0})
				//
				// by_mem = by_mem.sort(function(a,b) {return (a['percentage_mem'] > b['percentage_mem']) ? 1 : ((b['percentage_mem'] > a['percentage_mem']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['percentage_mem'] > 0})
				//
				// by_time = by_time.sort(function(a,b) {return (a['time'] > b['time']) ? 1 : ((b['time'] > a['time']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['time'] > 0})
				//
				// by_count = by_count.sort(function(a,b) {return (a['count'] > b['count']) ? 1 : ((b['count'] > a['count']) ? -1 : 0);} )
				// .reverse()
				// .filter(function(item, index){ return item['count'] > 0})

				by_cpu = Object.filter(by_cpu, function(item, index){ return item > 0})

				by_mem = Object.filter(by_mem, function(item, index){ return item > 0})

				by_time = Object.filter(by_time, function(item, index){ return item > 0})

				by_count = Object.filter(by_count, function(item, index){ return item > 0})


				cmds_stats_doc.data = {
					cmds_count: Object.keys(cmds_doc.data).length,
					'percentage_cpu': by_cpu,
					'percentage_mem': by_mem,
					time: by_time,
					count: by_count,
				}
				/**
				* bad, too many tags
				**/
				// cmds_stats_doc.metadata.tag.combine(Object.keys(cmds_stats_doc.data))

				next(cmds_doc, opts, next, pipeline)//was commented
				// next(cmds_stats_doc, opts, next, pipeline)

			}


		}//if
	}
	catch(e){
		// console.log(doc)
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
	// 			if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, 'percentage_cpu': 0, 'percentage_mem': 0, 'time': 0 }
	// 			// if(!per_command[command]) per_command[command] = { count: 0, 'percentage_cpu': 0, 'percentage_mem': 0, 'time': 0 }
  //
	// 			per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
	// 			per_uid[proc.uid]['count'] += 1
	// 			per_uid[proc.uid]['percentage_cpu'] += proc['percentage_cpu']
	// 			per_uid[proc.uid]['percentage_mem'] += proc['percentage_mem']
  //
	// 			// per_command[command]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
	// 			// per_command[command]['count'] += 1
	// 			// per_command[command]['percentage_cpu'] += proc['percentage_cpu'] * 1
	// 			// per_command[command]['percentage_mem'] += proc['percentage_mem'] * 1
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
