'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Pipeline');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Pipeline:Internals');
let ss = require('simple-statistics');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')
let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));


const InputPollerRethinkDBPeriodical = require ( './input/rethinkdb.js' )

let async = require('async')
// const { setIntervalAsync } = require('set-interval-async/dynamic')

let hooks = {}

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^munin/

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

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const roundSeconds = function(timestamp){
  let d = new Date(timestamp)
  d.setSeconds(0)

  return d.getTime()
}

const roundMinutes = function(timestamp){
  let d = new Date(timestamp)
  d.setMinutes(0)

  return d.getTime()
}

// const sleep = (milliseconds) => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds))
// }
//
// const pauseable = require('pauseable')

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
                table: 'logs'
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
              return cron.schedule('*/5 * * * * *', dispatch);//every minute
    				},
    				// periodical: 15000,
    				// periodical: 1000,//test
    			},
    		},
    	},
      {
    		poll: {

    			id: "input.historical",
          suspended: true,
    			conn: [
            Object.merge(
              Object.clone(conn),
              {
                // path_key: 'logs',
                module: InputPollerRethinkDBPeriodical,
                table: 'logs_historical'
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
              return cron.schedule('*/5 * * * * *', dispatch);//every 20 secs
    				},
    				// periodical: 15000,
    				// periodical: 1000,//test
    			},
    		},
    	}
    ],

    filters: [
      function(doc, opts, next, pipeline){
        debug('1st filter %o', doc)
        if(doc && doc.id === 'default' && doc.data && doc.metadata && doc.metadata.from === 'logs'){
          let { type, input, input_type, app } = opts

          // let hosts = []
          // let paths = []
          // let range = [0,0]
          // let historical_range = [0,0]

          // if(doc && doc.data && doc.metadata && doc.metadata.from === 'logs'){
          if(!pipeline.current) pipeline.current = {}
          pipeline.current[doc.metadata.from] = doc

          Array.each(doc.data, function(group, index){
            // range[0] = (group.range && (group.range[0] < range[0] || range[0] === 0)) ? group.range[0] : range[0]
            // range[1] = (group.range && group.range[1] > range[1] ) ? group.range[1] : range[1]
            // hosts.combine(group.hosts)
            // paths.push(group.path)
            Array.each(group.hosts, function(host){
              pipeline.get_input_by_id('input.historical').fireEvent('onOnce', {
                id: "default",
                query: {
                  "q": [
                		"data",
                		// {"metadata": ["host", "tag", "timestamp", "path", "range"]}
                    "metadata"
                	],
                	"transformation": [
                		{
                		"orderBy": {"index": "r.desc(timestamp)"}
                		},
                		{
                			"slice": [0, 1]
                		}


                	],
                	"filter": ["r.row('metadata')('path').eq('"+group.path+"')", "r.row('metadata')('host').eq('"+host+"')"]
                },
                params: {},
              })
            })

          })
          // }
          // else if(doc && doc.metadata && doc.metadata.from === 'logs_historical'){
          //
          // }

          // debug('filter %o %o %o', doc, range, hosts, paths)
          // next({id: 'munin.default', hosts, paths, range}, opts, next, pipeline)
        }
        else{
          next(doc, opts, next, pipeline)
        }

        // throw new Error('fix mngr-ui-admin Range - there are problems with filter/trasnformation/etc params')
        /**
        * get_input_by_id
        {

        	"q": [
        		"data",
        		{"metadata": ["host", "tag", "timestamp"]}
        	],
        	"transformation": [
        		{
        		"orderBy": {"index": "r.desc(timestamp)"}
        		},
        		{
        			"slice": [0, 1]
        		}


        	],
        	"filter": "r.row('metadata')('path').eq('munin.entropy')"

        }
        *
        **/
        // input_type.fireEvent('onOnce', {
        //   query: {register: true}
        // })
      },

      function(doc, opts, next, pipeline){
        // debug('2nd filter %o', doc)

        if(doc && doc.id === 'default' && doc.metadata && doc.metadata.from === 'logs_historical'){
          let { type, input, input_type, app } = opts

          let ranges = []
          let data

          let path = doc.metadata.filter[0].replace("r.row('metadata')('path').eq('", '')
          path = path.substring(0, path.indexOf("'"))

          let host = doc.metadata.filter[1].replace("r.row('metadata')('host').eq('", '')
          host = host.substring(0, host.indexOf("'"))

          let range = []
          let end_range
          // debug('HOST %s', host)
          // process.exit(1)
          /**
          * if no data (404)
          **/
          if(doc.err && pipeline.current['logs'] && pipeline.current['logs'].data){
            data = pipeline.current['logs'].data

            Array.each(data, function(group){
              if(group.path === path){
                range[0] = group.range[0]
                range[1] = roundSeconds(range[0] + 61000)//limit on next minute
                end_range = group.range[1]
              }

            })

          }
          else if(doc.data){
            data = doc.data
            debug('2nd filter %o', data)
            Array.each(data, function(group){
              Array.each(group, function(group_item){
                range[0] = group_item.metadata.range.end + 60000
                range[1] = roundSeconds(range[0] + 61000)//limit on next minute
                end_range = Date.now()
              })
            })
            // process.exit(1)
          }

          debug('range %s %s %o %s', new Date(range[0]), new Date(range[1]), host, path)
          // process.exit(1)

          do{

            // for(let i = 0; i < group.hosts.length; i++){
            //   let host = group.hosts[i]
              // let ranges = []
              ranges.push({
                id: "range",
                Range: "posix "+range[0]+"-"+range[1]+"/*",
                query: {
                  "q": [
                    "id",
                    "data",
                    // {"metadata": ["host", "tag", "timestamp", "path"]}
                    "metadata"
                  ],
                  "transformation": [
                    {
                    "orderBy": {"index": "r.desc(timestamp)"}
                    },
                    // {
                    // 	"slice": [0, 1]
                    // }


                  ],
                  "filter": [
                    "r.row('metadata')('path').eq('"+path+"')",
                    "r.row('metadata')('host').eq('"+host+"')",
                    "r.row('metadata')('type').eq('periodical')"
                  ]
                },
                params: {},


              })

            // }
            range[0] = range[1]
            range[1] += 60000//limit on next minute

          }
          while(range[0] < end_range)





          debug('RANGES %O', ranges)
          // process.exit(1)
          // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', [ranges])

          // async.tryEach(ranges)
          async.eachLimit(
            ranges,
            10,
            function(range, callback){
              // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
              // callback()
              let wrapped = async.timeout(function(range){
                // sleep(1001).then( () => {
                //   // process.exit(1)
                //   debug('RANGE', range)
                // })


                pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
                // process.exit(1)
                // callback()
              }, 100)

              // try{
              wrapped(range, function(err, data) {
                if(err){
                  // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
                  callback()
                }
              })
              // }
              // catch(e){
              //   callback()
              // }
            }
          )

          // debug('filter os_historical %o', pipeline.current)
          // next(doc, opts, next, pipeline)
        }
        else{
          next(doc, opts, next, pipeline)
        }
      },
      /**
      * process filter
      **/
      function(doc, opts, next, pipeline){
        // debug('3rd filter %o', doc)

        if(doc && doc.id === 'range' && doc.metadata && doc.metadata.from === 'logs' && doc.data){
          debug('process filter %o', doc)
          // process.exit(1)
          let values = {};
          let first, last
          let tag = []
          let metadata = {}
          let hooks = {}

          // if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){



          Array.each(doc.data, function(doc_data, d_index){

            // debug('DOC DATA', doc_data)
            first = doc_data[0].metadata.timestamp;

            last = doc_data[doc_data.length - 1].metadata.timestamp;

            Array.each(doc_data, function(group, group_index){
              debug('GROUP', group)

              let path = group.metadata.path


              debug_internals('PATH', path)

              if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

                // let data = doc.data
                let timestamp = group.metadata.timestamp;
                let host = group.metadata.host
                tag.combine(group.metadata.tag)
                metadata = Object.merge(metadata, group.metadata)

                if(!values[host]) values[host] = {};
                if(!values[host][path]) values[host][path] = {};

                try{
                  //debug_internals('HOOK path %s', path)
                  let _require = require('../hooks/'+path)
                  if(_require)
                    hooks[path] = _require
                }
                catch(e){
                  // //debug_internals('no hook file for %s', path)
                }

                debug_internals('HOOKs', hooks)
                // process.exit(1)

                Object.each(group.data, function(value, key){//item real data

                  let _key = key
                  debug('KEY', key)
                  // process.exit(1)

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




            })

          })





//
//
          // if(values.colo && values.colo)
          // debug_internals('values %o', values)
          // process.exit(1)

          if(Object.getLength(values) > 0){
            Object.each(values, function(host_data, host){

              let new_doc = {data: {}, metadata: {tag: [], range: {start: null, end: null}}};

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

                  debug_internals('HOOK DOC KEY %s %s', key, _key)
                  // process.exit(1)

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

                  /**
                  * add other metadata fields like "domain" for logs
                  */
                  new_doc['metadata'] = Object.merge(metadata, {
                    tag: tag,
                    type: 'minute',
                    host: host,
                    // path: 'historical.'+path,
                    path: path,
                    range: {
                      start: first,
                      end: last
                    }
                  })



                });

                new_doc.id = new_doc.metadata.host+
                  // '.historical.minute.'+
                  '.minute.'+
                  new_doc.metadata.path+'.'+
                  new_doc.metadata.range.start+'-'+
                  new_doc.metadata.range.end+'@'+Date.now()

                // if(path !== 'os.procs'){
                debug('NEW DOC %o', new_doc)
                // process.exit(1)
                // }

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
      }


   	],
  	output: [
      {
  			rethinkdb: {
  				id: "output.historical.minute.rethinkdb",
  				conn: [
            Object.merge(
              Object.clone(conn),
              {table: 'logs_historical'}
            )
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
