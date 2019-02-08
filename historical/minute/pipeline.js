'use stric'

let debug = require('debug')('Server:Apps:Historical:Minute:Pipeline');
let debug_internals = require('debug')('Server:Apps:Historical:Minute:Pipeline:Internals');
let ss = require('simple-statistics');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')
let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));


const InputPollerRethinkDBPeriodical = require ( './input/rethinkdb.js' )

let hooks = {}

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin/

let __white_black_lists_filter = function(whitelist, blacklist, str){
  let filtered = false
  if(!blacklist && !whitelist){
    filtered = true
  }
  else if(blacklist && !blacklist.test(str)){
    filtered = true
  }
  else if(blacklist && blacklist.test(str) && (whitelist && whitelist.test(str))){
    filtered = true
  }
  else if(!blacklist && (whitelist && whitelist.test(str))){
    filtered = true
  }

  return filtered
}

module.exports = function(conn){
  let conf = {
    input: [
    	{
    		poll: {

    			id: "input.periodical",
    			conn: [
            Object.merge(
              Object.clone(conn),
              {
                // path_key: 'os',
                module: InputPollerRethinkDBPeriodical,
              }
            )
    			],
    			connect_retry_count: -1,
    			connect_retry_periodical: 1000,
    			// requests: {
    			// 	periodical: 1000,
    			// },
          requests: {
    				/**
    				 * runnign at 20 secs intervals
    				 * needs 3 runs to start analyzing from last historical (or from begining)
    				 * it takes 60 secs to complete, so it makes historical each minute
    				 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
    				 * */
    				periodical: function(dispatch){
    					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
              return cron.schedule('*/20 * * * * *', dispatch);//every 20 secs
    				},
    				// periodical: 15000,
    				// periodical: 1000,//test
    			},
    		},
    	}
    ],

    filters: [
   		// require('./snippets/filter.sanitize.template'),
       function(doc, opts, next, pipeline){
         let { type, input, input_type, app } = opts

         if(
     				typeof(doc) == 'array'
     				|| doc instanceof Array
     				|| Array.isArray(doc)
     				&& doc.length > 0 && doc[0].data && doc[0].data !== null
     				&& doc[doc.length - 1] && doc[doc.length - 1].data && doc[doc.length - 1].data !== null
     			){

            let first = doc[0].metadata.timestamp;

            // //debug_internals('doc %s %s', path, host)

            let last = doc[doc.length - 1].metadata.timestamp;

            let values = {};


            Array.each(doc, function(d, d_index){
              let path = d.metadata.path
              if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

                let data = d.data
                let timestamp = d.metadata.timestamp;


        				let host = d.metadata.host

        				if(!values[host]) values[host] = {};

        				if(!values[host][path]) values[host][path] = {};

                try{
                  //debug_internals('HOOK path %s', path)

                  let _require = require('./hooks/'+path)
                  if(_require)
                    hooks[path] = _require
                }
                catch(e){
                  // //debug_internals('no hook file for %s', path)
                }

                debug_internals('HOOKs', hooks)

                Object.each(data, function(value, key){
                  let _key = key
                  if(hooks[path]){
                    Object.each(hooks[path], function(hook_data, hook_key){
                      // if(path == 'os.blockdevices')
                      //   //debug_internals('KEY %s %s', key, hook_key)

                      if(hook_data[hook_key] && hook_data[hook_key] instanceof RegExp){
                        // //debug_internals('KEY %s %s %o', key, hook_key, hook_data[hook_key])

                        if(hook_data[hook_key].test(_key))//if regexp match
                          _key = hook_key
                      }
                      // else{
                      //
                      // }
                    })

                  }

                  // if(path == 'os.procs')
                  //   debug_internals('KEY %s %s', key, _key)

                  if(!values[host][path][key]){

                    if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].key == 'function'){
                      values[host][path] = hooks[path][_key].key(values[host][path], timestamp, value, key)

                      if(values[host][path][key] == undefined)
                        delete values[host][path][key]
                    }
                    else{
                      values[host][path][key] = {};
                    }
                  }


                  if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'){
                    values[host][path] = hooks[path][_key].value(values[host][path], timestamp, value, key)

                  }
                  else{
                    values[host][path][key][timestamp] = value;

                  }


                });

                if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                  values[host][path] = hooks[path].post_values(values[host][path])
                }

              }//__white_black_lists_filter


            });

            // if(values.colo && values.colo)
            //   debug_internals('values %o', values.colo)

            if(Object.getLength(values) > 0){
              Object.each(values, function(host_data, host){

                let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};

                Object.each(host_data, function(data, path){

                  Object.each(data, function(value, key){
                    let _key = key
                    if(hooks[path]){
                      Object.each(hooks[path], function(data, hook_key){
                        if(data[hook_key] && data[hook_key] instanceof RegExp){
                          if(data[hook_key].test(key))//if regexp match
                            _key = hook_key
                        }
                        // else{
                        //
                        // }
                      })

                    }

                    // debug_internals('HOOK DOC KEY %s %s', key, _key)

                    if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].doc == 'function'){
                      new_doc.data = hooks[path][_key].doc(new_doc.data, value, key)

                      if(path == 'os.mounts')
                        debug_internals('value %s %o', key, new_doc.data)
                    }
                    else{
                      let data_values = Object.values(value);
                      let min = ss.min(data_values);
                      let max = ss.max(data_values);

                      new_doc['data'][key] = {
                        // samples : value,
                        min : min,
                        max : max,
                        mean : ss.mean(data_values),
                        median : ss.median(data_values),
                        mode : ss.mode(data_values),
                        range: max - min
                      };
                    }

                    new_doc['metadata'] = {
                      type: 'minute',
                      host: host,
                      // path: 'historical.'+path,
                      path: path,
                      range: {
                        start: first,
                        end: last
                      }
                    };



                  });

                  sanitize_filter(
                    new_doc,
                    opts,
                    pipeline.output.bind(pipeline),
                    pipeline
                  )

                })
              });

            }//if(Object.getLength(values) > 0)


          }


       },

   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.historical.minute.rethinkdb",
  				conn: [
  					{
              host: 'elk',
  						port: 28015,
  						db: 'servers',
              table: 'historical',
  					},
  				],
  				module: require('js-pipeline/output/rethinkdb'),
          buffer:{
  					size: 0,
  					expire:0
  				}
  			}
  		}
  	]
  }

  return conf
}
