/**
* https://stackoverflow.com/questions/16726779/how-do-i-get-the-total-cpu-usage-of-an-application-from-proc-pid-stat
* https://www.npmjs.com/package/sysconf
uid,ppid,etimes,cputime,pcpu,pmem,stat,command,lstart

"uid",
"ppid",
cputime =utime+stime+cutime+cstime
stat=state
"comm"
"starttime"

https://github.com/sonnyp/proctor/blob/master/index.js

var CLK_TCK = (function () {
  try {
    return +execSync('getconf CLK_TCK', {encoding: 'utf8'})
  } catch (e) {
    return NaN
  }
}())

* http://linuxcommand.org/lc3_man_pages/ps1.html
* https://www.redhat.com/archives/axp-list/2001-January/msg00355.html
**/

var debug = require('debug')('filter:os-procs');
var debug_internals = require('debug')('filter:os-procs:Internals');

var execSync = require('child_process').execSync

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/
module.exports = function(doc, opts, next, pipeline){
	// pipeline.current_uptime is set by "os" docs
	if(!pipeline.CLK_TCK)
		try {
			pipeline.CLK_TCK = execSync('getconf CLK_TCK', {encoding: 'utf8'})
		}
		catch (e) {
			// return NaN
			debug_internals('CLK_TCK err', e)
		}

	//list of properties we wanna sabe
	let doc_proc_template = [
		"ppid",
		"state",
		"comm",
		"starttime",
		"utime",
		"stime",
		"rss",
		"vsize",
		"uid",
		"gid",
		"cputime",
		"pcpu",
		"etime",
		// "argv",
	]

	try{
		if(
			pipeline.current_uptime
			&& pipeline.CLK_TCK
			&& doc !== null
			&& doc.data
		){

			debug_internals('CLK_TCK %d', pipeline.CLK_TCK)
			debug_internals('pipeline.current_uptime %d', pipeline.current_uptime)
			// debug_internals('doc.data', doc.data)
			// throw new Error()

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

						//if it has all fields needed
						if(proc.stat && !proc.stat.errno && proc.status && !proc.status.errno){
							proc.status.uid = proc.status.Uid.split("\t")[0] *1 //read uid
							proc.status.gid = proc.status.Gid.split("\t")[0] * 1//read gid
							proc.stat.cputime = Math.floor(( proc.stat.utime + proc.stat.stime ) / pipeline.CLK_TCK)
							proc.stat.etime = pipeline.current_uptime - Math.floor(proc.stat.starttime / pipeline.CLK_TCK)

							proc.stat.pcpu = (proc.stat.etime > 0)
								? 1 * ( (100 * proc.stat.cputime)  / proc.stat.etime).toFixed(3)
								: 0


							/**
							* merge properties and erase unneeded
							**/
							let tmp_proc = Object.merge(proc.stat, proc.status)
							Object.each(tmp_proc, function(data, prop){
								if(!doc_proc_template.contains(prop))
									delete tmp_proc[prop]
							})
							tmp_proc.argv = proc.argv

							if(
								!procs[pid]
								|| ( procs[pid].ppid == proc.stat.ppid
									&& procs[pid].uid == proc.status.uid
									&& procs[pid].comm == proc.stat.comm
								)
							){//if procs match
								procs[pid] = tmp_proc

							}
							else{
								matched_proc_counter++
								procs[pid+'.'+matched_proc_counter] = tmp_proc
							}

						}


					})
				})

				//save last doc as our "doc"
				let procs_doc = Object.clone(pipeline.procs.buffer[pipeline.procs.buffer.length - 1])
				pipeline.procs.buffer = []//clear buffer

				let per_uid = {}
				let per_comm = {}

				// debug_internals('procs %o',procs)
				// throw new Error()

				// Array.each(doc.data, function(proc){
				Object.each(procs, function(proc){
					// let command = proc.command[0]

					/**
					* @deprecated: used with ps output
					* convert time to seconds
					**/
					// let time = proc['time']
					// let dd = (time.indexOf('-') > -1) ? time.substring(0, time.indexOf('-')) * 1 : 0
          //
					// //remove days
					// time = (time.indexOf('-') > -1) ? time.substring(time.indexOf('-') + 1, time.length - 1) : time
          //
					// let hs =  time.split(':')[0] * 1
					// let mm =  time.split(':')[1] * 1
					// let ss =  time.split(':')[2] * 1
					/** **/

					/**
					* @deprecated: used with ps output
					**/
					// Object.each(proc, function(val, prop){
					// 	if(!isNaN(val * 1)) proc[prop] = val * 1 //type cast to number
					// })
					// proc['time'] = ss + (mm * 60) + (hs * 3600) + (dd * 86400)

					if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0 , utime: 0, stime: 0, rss: 0, vsize: 0, cputime: 0, pcpu: 0, etime: 0}
					if(!per_comm[proc.comm]) per_comm[proc.comm] = { count: 0 , utime: 0, stime: 0, rss: 0, vsize: 0, cputime: 0, pcpu: 0, etime: 0}

					per_uid[proc.uid]['count'] += 1
					per_uid[proc.uid]['etime'] += proc['etime']
					per_uid[proc.uid]['pcpu'] += proc['pcpu']
					per_uid[proc.uid]['cputime'] += proc['cputime']
					per_uid[proc.uid]['rss'] += proc['rss']
					per_uid[proc.uid]['vsize'] += proc['vsize']
					per_uid[proc.uid]['utime'] += proc['utime']
					per_uid[proc.uid]['stime'] += proc['stime']

					per_comm[proc.comm]['count'] += 1
					per_comm[proc.comm]['etime'] += proc['etime']
					per_comm[proc.comm]['pcpu'] += proc['pcpu']
					per_comm[proc.comm]['cputime'] += proc['cputime']
					per_comm[proc.comm]['rss'] += proc['rss']
					per_comm[proc.comm]['vsize'] += proc['vsize']
					per_comm[proc.comm]['utime'] += proc['utime']
					per_comm[proc.comm]['stime'] += proc['stime']



					// debug_internals('procs doc', per_uid)
					// doc_per_uid.data.push(per_uid)

					// procs[proc.pid] = proc
				})


				// let procs_doc = Object.clone(doc)
				delete procs_doc.data
				procs_doc.data = {pids: {}, uids: {}, comm: {}}
				procs_doc.data.pids = procs
				procs_doc.data.uids = per_uid
				procs_doc.data.comm = per_comm
				if(!procs_doc.metadata) procs_doc.metadata = {}
				procs_doc.metadata.path = 'os.procs'

				// next(procs_doc, opts, pipeline.output.bind(pipeline))

				// debug_internals('procs %o',per_uid)
				// throw new Error()


				next(procs_doc, opts, next, pipeline)

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
