var debug = require('debug')('filter:os-networkInterfaces');
var debug_internals = require('debug')('filter:os-networkInterfaces:Internals');

/**
* we only want a doc per sec, so we buffer all docs = 1000 ms / perdiocal ms
* if 2 procs match pid but are different, we use pid.0 ....pid.N
* good read -> https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result
**/
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
        Array.each(messures, function(messure){// "bytes" | "packets"
          if(!networkInterfaces[iface+'_'+messure])
            networkInterfaces[iface+'_'+messure] = {}

          Array.each(properties, function(property, index){
            /**
            * properties[0] is "if", we want recived | transmited only
            **/
            if(index != 0 && val[iface] && val[iface][property] && val[iface][property][messure]){
              networkInterfaces[iface+'_'+messure][property] = val[iface][property][messure] * 1
							if(isNaN(networkInterfaces[iface+'_'+messure][property]))
								delete networkInterfaces[iface+'_'+messure][property]
            }

          })

        })

      })


			debug_internals('networkInterfaces %o', networkInterfaces)

      let networkInterfaces_stats_doc = {
        data: networkInterfaces,
        metadata:{
					host: host,
          path: 'os.networkInterfaces.stats',
					tag: ['os', 'networkInterfaces', 'stats'].combine(Object.keys(networkInterfaces))
        }
      }
			// debug_internals('networkInterfaces %o', val)
			// process.exit(1)

			let networkInterfaces_doc = {
        data: val,
        metadata:{
					host: host,
          path: 'os.networkInterfaces',
					tag: ['os', 'networkInterfaces', 'if', 'recived', 'transmited'].combine(Object.keys(val.lo.if[0]))
        }
      }




			next(networkInterfaces_doc, opts, next, pipeline)
			// next(networkInterfaces_stats_doc, opts, next, pipeline)

			// }


		}//if
	// }
	// catch(e){
	// 	console.log(val)
	// 	throw e
	// }


};
