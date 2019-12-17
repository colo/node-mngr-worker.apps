var debug = require('debug')('filter:os-networkInterfaces');
var debug_internals = require('debug')('filter:os-networkInterfaces:Internals');

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/

const messure_filter = /^((?!multicast|frame|compressed|fifo).)*$/ //this RegExp is negated
const iface_filter = /^((?!tap).)*$/ //this RegExp is negated

module.exports = function(val, opts, next, pipeline){
	let { type, input, input_type, app } = opts
	let host = input_type.options.id

	// try{
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
        // Array.each(messures, function(messure){// "bytes" | "packets"
        //   if(!networkInterfaces[iface+'_'+messure])
        //     networkInterfaces[iface+'_'+messure] = {}
				//
        //   Array.each(properties, function(property, index){
        //     /**
        //     * properties[0] is "if", we want recived | transmited only
        //     **/
        //     if(index != 0 && val[iface] && val[iface][property] && val[iface][property][messure]){
        //       networkInterfaces[iface+'_'+messure][property] = val[iface][property][messure] * 1
				// 			if(isNaN(networkInterfaces[iface+'_'+messure][property]))
				// 				delete networkInterfaces[iface+'_'+messure][property]
        //     }
				//
        //   })
				//
        // })

				Array.each(messures, function(messure){// "bytes" | "packets"
					if(!networkInterfaces[iface]) networkInterfaces[iface] = {}

					if(!networkInterfaces[iface][messure]) networkInterfaces[iface][messure] = {}

          Array.each(properties, function(property, index){
            /**
            * properties[0] is "if", we want recived | transmited only
            **/
            if(index != 0 && val[iface] && val[iface][property] && val[iface][property][messure]){
              networkInterfaces[iface][messure][property] = val[iface][property][messure] * 1
							if(isNaN(networkInterfaces[iface][messure][property]))
								delete networkInterfaces[iface][messure][property]
            }

          })

        })

      })


			debug_internals('networkInterfaces %o', networkInterfaces)
			let networkInterfaces_stats_doc = {
        data: {},
        metadata:{
					host: host,
          path: 'os.networkInterfaces',
					tag: ['os', 'networkInterfaces']
        }
      }

			/**
			* one per iface
			**/
			// Object.each(networkInterfaces, function(data, iface){
			// 	let doc = Object.clone(networkInterfaces_stats_doc)
			// 	doc.metadata.path += '.'+iface
			// 	doc.metadata.tag.push(iface)
			// 	doc.metadata.tag = doc.metadata.tag.combine(Object.keys(data))
			// 	doc.data = data
			//
			// 	next(doc, opts, next, pipeline)
			//
			// })

			/**
			* one per messure per iface
			**/
			// Object.each(networkInterfaces, function(data, iface){
			// 	if((iface_filter && iface_filter.test(iface)) || !iface_filter){
			// 		Object.each(data, function(value, messure){
			// 			if((messure_filter && messure_filter.test(messure)) || !messure_filter){
			// 				let doc = Object.clone(networkInterfaces_stats_doc)
			// 				doc.metadata.path += '.'+iface+'.'+messure
			// 				doc.metadata.tag.combine([iface, messure])
			// 				doc.metadata.tag.combine(Object.keys(data))
			// 				doc.data = value
			//
			// 				next(doc, opts, next, pipeline)
			// 			}
			//
			// 		})
			// 	}
			//
			//
			//
			// })

			/**
			* one doc per packets and one per bytes per iface
			**/

			Object.each(networkInterfaces, function(data, iface){
				if((iface_filter && iface_filter.test(iface)) || !iface_filter){
					let bytes_doc = Object.clone(networkInterfaces_stats_doc)
					bytes_doc.metadata.tag.combine([iface, 'bytes'])
					bytes_doc.metadata.path += '.'+iface+'.bytes'

					let packets_doc = Object.clone(networkInterfaces_stats_doc)
					packets_doc.metadata.tag.combine([iface, 'packets'])
					packets_doc.metadata.path += '.'+iface+'.packets'

					Object.each(data, function(value, messure){
						if((messure_filter && messure_filter.test(messure)) || !messure_filter){
							if(messure === 'packets' || messure === 'errs' || messure === 'drop'){
								packets_doc.metadata.tag.combine([messure])

								Object.each(value, function(val, property){
									packets_doc.metadata.tag.combine([property])
									packets_doc.data[messure+'_'+property] = val
								})
								// packets_doc.metadata.tag.combine(Object.keys(data))
							}
							else{

								bytes_doc.metadata.tag.combine(Object.keys(data))
								bytes_doc.data = value
							}


						}

					})

					next(bytes_doc, opts, next, pipeline)
					next(packets_doc, opts, next, pipeline)
				}



			})




      // let networkInterfaces_stats_doc = {
      //   data: networkInterfaces,
      //   metadata:{
			// 		host: host,
      //     path: 'os.networkInterfaces.stats',
			// 		tag: ['os', 'networkInterfaces', 'stats'].combine(Object.keys(networkInterfaces))
      //   }
      // }
			// next(networkInterfaces_stats_doc, opts, next, pipeline)

			/**
			* commented on 11/12/2019
			* this should be an INFO doc?
			let networkInterfaces_doc = {
        data: val,
        metadata:{
					host: host,
          path: 'os.networkInterfaces',
					tag: ['os', 'networkInterfaces', 'if', 'recived', 'transmited'].combine(Object.keys(val.lo.if[0]))
        }
      }
			next(networkInterfaces_doc, opts, next, pipeline)
			**/




			// }


		}//if
	// }
	// catch(e){
	// 	console.log(val)
	// 	throw e
	// }


};
