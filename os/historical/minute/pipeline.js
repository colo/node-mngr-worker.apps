'use stric'

let debug = require('debug')('Server:Apps:OS:Historical:Minute:Pipeline');
let debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Pipeline:Internals');
let ss = require('simple-statistics');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')
let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));


const InputPollerRethinkDBOS = require ( './input/rethinkdb.os.js' )

let hooks = {}

let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os.blockdevices$|^os.mounts$/

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

    			id: "input.os",
    			conn: [
            Object.merge(
              Object.clone(conn),
              {
                // path_key: 'os',
                module: InputPollerRethinkDBOS,
              }
            )
    			],
    			connect_retry_count: 5,
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
    				// periodical: function(dispatch){
    				// 	// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
            //   return cron.schedule('*/20 * * * * *', dispatch);//every 20 secs
    				// },
    				// periodical: 15000,
    				periodical: 2000,//test
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
                //debug_internals('HOOKs', hooks)

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

                  if(path == 'os.blockdevices')
                    debug_internals('KEY %s %s', key, _key)

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
                  // else if (path == 'os.blockdevices') {//keep only stats, partitions may be done in the future
                  //   // delete values[host][path][key]
                  //   // values[host][path][key].push(value.stats);
                  //   // values[host][path][key][timestamp] = value.stats
                  //   if(!values[host][path][key][timestamp]) values[host][path][key][timestamp] = {}
                  //   Object.each(value.stats, function(val, prop){
                  //     values[host][path][key][timestamp][prop] = val * 1
                  //   })
                  //   ////debug_internals('os.blockdevices %o',values[host][path][key][timestamp])
                  // }
                  // else if (path == 'os.mounts') {//keep only stats, partitions may be done in the future
                  //   // values[host][path][key].push(value.stats);
                  //
                  //   delete values[host][path][key]//remove numerical key, gonna change it for DEVICE
                  //
                  //   if(os_mounts_type_filter.test(value.type)){
                  //     // ////debug_internals('os.mounts %o', value)
                  //
                  //     let key = value.fs.replace('/dev/', '')
                  //
                  //     if(!values[host][path][key]) values[host][path][key] = {}
                  //       // values[host][path][key] = []
                  //
                  //     let data = {};
                  //
                  //     //value * 1 - type cast string -> int
                  //     data = {
                  //       bloks: value.bloks * 1,
                  //       used: value.used * 1,
                  //       availabe: value.availabe * 1,
                  //       percentage: value.percentage * 1
                  //     }
                  //
                  //     // values[host][path][key].push(data);
                  //     values[host][path][key][timestamp] = data;
                  //   }
                  //   // else{
                  //   //
                  //   // }
                  //
                  //
                  // }
                  // else if (path == 'os.procs') {
                  //   // delete values[host][path][key]
                  //
                  //   if(key == 'pids'){//stats only for 'pids' key...'uid' sorted is avoided
                  //     Object.each(value, function(proc, pid){
                  //
                  //       let prop = pid+':'+proc['ppid']+':'+proc['cmd'] //pid + ppid + command
                  //
                  //       if(!values[host][path][key][prop]) values[host][path][key][prop] = {}
                  //
                  //       let data = {
                  //         // '_pid': proc['pid'],
                  //         // '_ppid': proc['ppid'],
                  //         // '_command': proc['_command'],
                  //         '%cpu': proc['%cpu'],
                  //         '%mem': proc['%mem'],
                  //         'rss': proc['rss'],
                  //         'vsize': proc['vsize']
                  //         // 'time':
                  //       }
                  //
                  //       values[host][path][key][prop][timestamp] = data
                  //
                  //     })
                  //   }
                  //   else{//prop = uids || cmd
                  //     Object.each(value, function(data, prop){
                  //       if(!values[host][path][key][prop]) values[host][path][key][prop] = {}
                  //       values[host][path][key][prop][timestamp] = data
                  //     })
                  //
                  //   }
                  //
                  //
                  //
                  //
                  //   // if(!values[host][path+'.uid']) values[host][path+'.uid'] = {}
                  //   // if(!values[host][path+'.uid'][value['uid']]) values[host][path+'.uid'][value['uid']] = {}
                  //   //
                  //   // let uid_data = {
                  //   // 	'%cpu': value['%cpu'],
                  //   // 	'%mem': value['%mem']
                  //   // 	// 'time':
                  //   // }
                  //   //
                  //   // values[host][path+'.uid'][value['uid']][timestamp] = uid_data
                  //
                  //   // //debug_internals('procs %o',values)
                  // }
                  // else if (path == 'os.procs:uid') {
                  // 	// delete values[host][path][key]
                  //
                  // 	//debug_internals('procs:uid %o',value)
                  // }
                  else{
                    values[host][path][key][timestamp] = value;

                  }


                });

                if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                  values[host][path] = hooks[path].post_values(values[host][path])
                }

              }//__white_black_lists_filter


            });

            if(values.elk && values.elk)
              debug_internals('values %o', values.elk)

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
                    }

                    // else if (path == 'os.procs'){
                    //
                    //   // //debug_internals('os.procs prop %s %o', key, value)
                    //
                    //   Object.each(value, function(val, prop){
                    //     // //debug_internals('os.procs prop %s %o', prop, val)
                    //
                    //     let obj_data = value_to_data(val, false)
                    //
                    //     if(!new_doc['data'][key]) new_doc['data'][key] = {}
                    //
                    //     new_doc['data'][key][prop] = Object.clone(obj_data)
                    //
                    //   })
                    //
                    // }
                    // else if (
                    //   path == 'os.mounts'
                    //   || path == 'os.blockdevices'
                    //   // || path == 'os.procs'
                    // ) {
                    //
                    //   // if (path == 'os.procs')
                    //   // 	//debug_internals('os.procs data %s %o', key, value)
                    //
                    //   let obj_data = value_to_data(value, true)
                    //
                    //   new_doc['data'][key] = Object.clone(obj_data)
                    //
                    //   // if (path == 'os.procs')
                    //     // //debug_internals('os.procs data %s %o', key, new_doc['data'][key])
                    // }
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



                  // next(new_doc, opts);
                  //debug_internals('new_doc', new_doc.metadata)

                  // next(new_doc, opts, next, pipeline)
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

    // filters: [
    //   // decompress_filter,
    //   require('./filter'),
    //   function(doc, opts, next, pipeline){
    //     sanitize_filter(
    //       doc,
    //       opts,
    //       // function(doc, opts, next, pipeline){
    //       //   compress_filter(
    //       //     doc,
    //       //     opts,
    //       //     pipeline.output.bind(pipeline),
    //       //     pipeline
    //       //   )
    //       // },
    //       pipeline.output.bind(pipeline),
    //       pipeline
    //     )
    //   }
    //   // sanitize_filter,
    //   // compress_filter
    // ],
    // output: [
    //   function(doc){
    //     let output = require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template'))
    //     output(JSON.encode(doc))
    //   }
    //
    // ]
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
