var debug = require('debug')('filter:os-networkInterfaces');
var debug_internals = require('debug')('filter:os-networkInterfaces:Internals');

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/
module.exports = function(val, opts, next, pipeline){
	try{
		if(
			val !== null
			// & %o& doc.data
		){

      // debug_internals('doc %o', val)

      let networkInterfaces = {}
      // let val = state.stats[this.host].os.networkInterfaces.value.data
      let ifaces = Object.keys(val)
      let properties = Object.keys(val[ifaces[0]])

      /**
      * properties[0] is "if", we want recived | transmited only
      **/
      let messures = Object.keys(val[ifaces[0]][properties[1]])

      Array.each(ifaces, function(iface){
        // if(!networkInterfaces[iface])
        //   networkInterfaces[iface] = {}
        /**
        * turn data property->messure (ex: transmited { bytes: .. }),
        * to: messure->property (ex: bytes {transmited:.., recived: ... })
        **/
        Array.each(messures, function(messure){// "bytes" | "packets"
          if(!networkInterfaces[iface+'_'+messure])
            networkInterfaces[iface+'_'+messure] = {}

          Array.each(properties, function(property, index){
            /**
            * properties[0] is "if", we want recived | transmited only
            **/
            if(index != 0){
              networkInterfaces[iface+'_'+messure][property] = val[iface][property][messure] * 1
							if(isNaN(networkInterfaces[iface+'_'+messure][property]))
								delete networkInterfaces[iface+'_'+messure][property]
            }

          })

        })

      })

      debug_internals('networkInterfaces %o', networkInterfaces)
      // return networkInterfaces

			// let procs_re = /procs/
			// // var ss = require('simple-statistics');
      //
			// if(!pipeline.procs) pipeline.procs = {}
			// if(!pipeline.procs.buffer) pipeline.procs.buffer = [] //create a buffer for procs
      //
			// if(!pipeline.procs.buffer_size){
			// 	Array.each(pipeline.inputs, function(input){
      //
			// 		if(procs_re.test(input.options.id)){
			// 			// debug_internals ('input.poll.requests.periodical', input.options)
			// 			pipeline.procs.buffer_size = Math.floor(1000 / input.options.requests.periodical)
			// 		}
			// 	})
			// }

			// debug_internals ('input.poll.requests.periodical', pipeline.procs.buffer_size)

			// pipeline.procs.buffer.push(doc)


			// if(pipeline.procs.buffer.length >= pipeline.procs.buffer_size ){
			// 	let procs = {}

				// Array.each(pipeline.procs.buffer, function(doc){
				// 	let matched_proc_counter = 0
				// 	// Array.each(doc.data, function(proc){
				// 	Object.each(doc.data, function(proc, pid){
				// 		if(
				// 			!procs[pid]
				// 			|| ( procs[pid].ppid == proc.ppid
				// 				&& procs[pid].uid == proc.uid
				// 				&& procs[pid].cmd == proc.cmd
				// 			)
				// 		){//if procs match
				// 			procs[pid] = proc
        //
				// 		}
				// 		else{
				// 			matched_proc_counter++
				// 			procs[pid+'.'+matched_proc_counter] = proc
				// 		}
        //
				// 	})
				// })

				//save last doc as our "doc"
				// let procs_doc = Object.clone(pipeline.procs.buffer[pipeline.procs.buffer.length - 1])
				// pipeline.procs.buffer = []//clear buffer

				// let per_uid = {}
				// let per_cmd = {}

				// Array.each(doc.data, function(proc){
				// Object.each(procs, function(proc){
				// 	// let command = proc.command[0]
        //
				// 	/**
				// 	* convert time to seconds
				// 	**/
				// 	let time = proc['time']
				// 	let dd = (time.indexOf('-') > -1) ? time.substring(0, time.indexOf('-')) * 1 : 0
        //
				// 	//remove days
				// 	time = (time.indexOf('-') > -1) ? time.substring(time.indexOf('-') + 1, time.length - 1) : time
        //
				// 	let hs =  time.split(':')[0] * 1
				// 	let mm =  time.split(':')[1] * 1
				// 	let ss =  time.split(':')[2] * 1
				// 	/** **/
        //
        //
				// 	Object.each(proc, function(val, prop){
				// 		if(!isNaN(val * 1)) proc[prop] = val * 1 //type cast to number
				// 	})
				// 	proc['time'] = ss + (mm * 60) + (hs * 3600) + (dd * 86400)
        //
				// 	if(!per_uid[proc.uid]) per_uid[proc.uid] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }
				// 	if(!per_cmd[proc.cmd]) per_cmd[proc.cmd] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0, 'rss': 0, 'vsz': 0 }
        //
				// 	per_uid[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				// 	per_uid[proc.uid]['count'] += 1
				// 	per_uid[proc.uid]['%cpu'] += proc['%cpu']
				// 	per_uid[proc.uid]['%mem'] += proc['%mem']
				// 	per_uid[proc.uid]['rss'] += proc['rss']
				// 	per_uid[proc.uid]['vsz'] += proc['vsz']
        //
				// 	per_cmd[proc.cmd]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				// 	per_cmd[proc.cmd]['count'] += 1
				// 	per_cmd[proc.cmd]['%cpu'] += proc['%cpu']
				// 	per_cmd[proc.cmd]['%mem'] += proc['%mem']
				// 	per_cmd[proc.cmd]['rss'] += proc['rss']
				// 	per_cmd[proc.cmd]['vsz'] += proc['vsz']
        //
        //
        //
				// 	// debug_internals('procs doc', per_uid)
				// 	// doc_per_uid.data.push(per_uid)
        //
				// 	// procs[proc.pid] = proc
				// })


        let networkInterfaces_doc = {
          data: networkInterfaces,
          metadata:{
            path: 'os.networkInterfaces.stats'
          }
        }

				// delete procs_doc.data
				// procs_doc.data = {pids: {}, uids: {}, cmd: {}}
				// procs_doc.data.pids = procs
				// procs_doc.data.uids = per_uid
				// procs_doc.data.cmd = per_cmd
				// if(!procs_doc.metadata) procs_doc.metadata = {}
				// procs_doc.metadata.path = 'os.procs'


				next(networkInterfaces_doc, opts, next, pipeline)

			// }


		}//if
	}
	catch(e){
		console.log(val)
		throw e
	}


};
