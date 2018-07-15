var debug = require('debug')('filter:os-procs');
var debug_internals = require('debug')('filter:os-procs:Internals');


module.exports = function(doc, opts, next, pipeline){

	// var ss = require('simple-statistics');

	try{
		if(
			doc !== null
			&& doc.data
		){

			let per_uid = {
				data: {},
			}

			// let per_uid = {}
			// let per_command = {}
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

				if(!per_uid.data[proc.uid]) per_uid.data[proc.uid] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }
				// if(!per_command[command]) per_command[command] = { count: 0, '%cpu': 0, '%mem': 0, 'time': 0 }

				per_uid.data[proc.uid]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				per_uid.data[proc.uid]['count'] += 1
				per_uid.data[proc.uid]['%cpu'] += proc['%cpu']
				per_uid.data[proc.uid]['%mem'] += proc['%mem']

				// per_command[command]['time'] += ss + (mm * 60) + (hs * 3600) + (dd * 86400)
				// per_command[command]['count'] += 1
				// per_command[command]['%cpu'] += proc['%cpu'] * 1
				// per_command[command]['%mem'] += proc['%mem'] * 1



				// debug_internals('procs doc', per_uid.data)
				// doc_per_uid.data.data.push(per_uid.data)
			})
			// doc_per_uid.data = per_uid

			// debug_internals('procs doc %o', doc_per_uid)

			// let save = function(save_doc){
      //   if(Array.isArray(save_doc)){
      //     this.fireEvent(this.ON_SAVE_MULTIPLE_DOCS, [save_doc]);
      //   }
      //   else{
      //     this.fireEvent(this.ON_SAVE_DOC, save_doc);
      //   }
      //   //this.fireEvent(this.ON_SAVE_DOC, save_doc);
      // }.bind(pipeline)

			let per_uid_opts_app = Object.clone(opts.app)
			per_uid_opts_app.options.id += '.uid'
			let { type, input, input_type, app } = opts


			next(
				Object.clone(per_uid),
				{
					type: type,
					input: input, input_type: input_type,
					app: per_uid_opts_app
				},
				pipeline.output.bind(pipeline)
			)

			next(Object.clone(doc), opts, pipeline.output.bind(pipeline))
			

		}//if
	}
	catch(e){
		console.log(doc)
		throw e
	}



  // next(doc, opts, next, pipeline)
};
