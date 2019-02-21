'use stric'

let debug = require('debug')('Server:Apps:UI:Pipeline');
let debug_internals = require('debug')('Server:Apps:UI:Pipeline:Internals');
let ss = require('simple-statistics');

const path = require('path');

let cron = require('node-cron');

// let compress_filter =  require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress')),
//     sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template')),
//     decompress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.decompress'))

// let os_filter = require('./filters/os')
let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));


const InputPollerRethinkDBPeriodical = require ( './input/rethinkdb.js' )

// let hooks = {}

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^[a-zA-Z0-9_\.]+$/
let paths_whitelist = /^os$|^os\.networkInterfaces\.stats$|^os\.blockdevices$|^os\.mounts$|^os\.procs\.stats$|^os\.procs\.uid\.stats$|^os\.procs\.cmd\.stats$|^munin/

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

let jscaching = require('js-caching')
let RethinkDBStoreIn = require('js-caching/libs/stores/rethinkdb').input
let RethinkDBStoreOut = require('js-caching/libs/stores/rethinkdb').output

let data_to_stat = require('node-tabular-data').data_to_stat
let data_to_tabular = require('node-tabular-data').data_to_tabular

const CHART_INSTANCE_TTL = 60000

let cache = new jscaching({
  suspended: false,
  ttl: 1999,
  stores: [
    {
      id: 'rethinkdb',
      conn: [
        {
          host: 'elk',
          port: 28015,
          db: 'servers',
          table: 'cache',
          module: RethinkDBStoreIn,
        },
      ],
      module: RethinkDBStoreOut,
    }
  ],
})

let __transform_data = function(type, data, cache_key, cb){
  // debug_internals('__transform_data', type)
  let convert = (type == 'stat') ? data_to_stat : data_to_tabular

  let transformed = {}
  let counter = 0 //counter for each path:stat in data
  // let instances = []
  let instances = {}

  if(!data || data == null && typeof cb == 'function')
    cb(transformed)

  /**
  * first count how many "transform" there are for this data set, so we can fire callback on last one
  **/
  let transform_result_length = 0
  Object.each(data, function(d, path){
    let transform = __traverse_path_require(type, path, d)

      if(transform && typeof transform == 'function'){
        transform_result_length += Object.getLength(transform(d))
      }
      else if(transform){
        transform_result_length++
      }
  })

  let transform_result_counter = 0

  Object.each(data, function(d, path){
    if(d && d !== null){
      let transform = __traverse_path_require(type, path, d) //for each path find a trasnform or use "default"

      if(transform){

        if(typeof transform == 'function'){
          let transform_result = transform(d, path)


          Object.each(transform_result, function(chart, path_key){

            /**
            * key may use "." to create more than one chart (per key), ex: cpus.times | cpus.percentage
            **/
            let sub_key = (path_key.indexOf('.') > -1) ? path_key.substring(0, path_key.indexOf('.')) : path_key


            if(type == 'tabular'){
              // debug_internals('transform_result', transform_result)

              cache.get(cache_key+'.'+type+'.'+__transform_name(path+'.'+path_key), function(err, chart_instance){
                chart_instance = (chart_instance) ? JSON.parse(chart_instance) : chart

                chart_instance = Object.merge(chart, chart_instance)

                // chart_instance = _transform(chart_instance)

                convert(d[sub_key], chart_instance, path+'.'+path_key, function(name, stat){
                  transformed = __merge_transformed(name, stat, transformed)

                  instances[__transform_name(path+'.'+path_key)] = chart_instance

                  cache.set(cache_key+'.'+type+'.'+__transform_name(path+'.'+path_key), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)

                  if(
                    transform_result_counter == transform_result_length - 1
                    && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                  ){
                    __save_instances(cache_key, instances, cb.pass(transformed))
                    // cb(transformed)
                  }

                  transform_result_counter++
                })



              })
            }
            else{
              convert(d[sub_key], chart, path+'.'+path_key, function(name, stat){
                transformed = __merge_transformed(name, stat, transformed)

                if(
                  transform_result_counter == transform_result_length - 1
                  && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                ){
                  cb(transformed)
                }


                transform_result_counter++
              })

            }





          })
        }
        else{//not a function

          /**
          * @todo: 'tabular' not tested, also counter should consider this case (right now only considers functions type)
          **/
          if(type == 'tabular'){
            cache.get(cache_key+'.'+type+'.'+__transform_name(path), function(err, chart_instance){
              chart_instance = (chart_instance) ? JSON.parse(chart_instance) : transform

              chart_instance = Object.merge(chart_instance, transform)
              // debug_internals('chart_instance NOT FUNC %o', chart_instance)

              // debug_internals('transformed custom CACHE', cache_key+'.'+type+'.'+path)

              // throw new Error()
              convert(d, chart_instance, path, function(name, stat){
                transformed = __merge_transformed(name, stat, transformed)

                instances[__transform_name(path)] = chart_instance
                cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)

                if(
                  transform_result_counter == transform_result_length - 1
                  && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                ){
                  __save_instances(cache_key, instances, cb.pass(transformed))
                  // cb(transformed)
                }

                transform_result_counter++

              })



            })
          }
          else{
            convert(d, transform, path, function(name, stat){
              transformed = __merge_transformed(name, stat, transformed)

              if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
                cb(transformed)

            })
          }

        }


      }
      else{//default
        if(type == 'tabular'){ //default trasnform for "tabular"

          // debug_internals('transform default', path)

          let chart = Object.clone(require('./libs/'+type)(d, path))

          cache.get(cache_key+'.'+type+'.'+__transform_name(path), function(err, chart_instance){
            chart_instance = (chart_instance) ? JSON.parse(chart_instance) : chart

            chart_instance = Object.merge(chart, chart_instance)

            // debug_internals('transform default', d, path)

            convert(d, chart_instance, path, function(name, stat){
              /**
              * clean stats that couldn't be converted with "data_to_tabular"
              **/
              Array.each(stat, function(val, index){
                Array.each(val, function(row, i_row){
                  if(isNaN(row))
                    val[i_row] = undefined
                })
                stat[index] = val.clean()
                if(stat[index].length <= 1)
                  stat[index] = undefined
              })
              stat = stat.clean()

              if(stat.length > 0)
                transformed = __merge_transformed(name, stat, transformed)

              instances[__transform_name(path)] = chart_instance

              cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)

              if(
                transform_result_counter == transform_result_length - 1
                && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
              ){
                __save_instances(cache_key, instances, cb.pass(transformed))
                // cb(transformed)
              }

              transform_result_counter++
            })



          })
        }
        else{//default trasnform for "stat"
          require('./libs/'+type)(d, path, function(name, stat){
            transformed = __merge_transformed(name, stat, transformed)

            if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
              cb(transformed)

          })
        }


      }



    }//end if(d && d !== null)

    counter++
  })


}

/**
* @removed: fireEvent
**/
let __save_instances = function(cache_key, instances, cb){
  // debug_internals('__save_instances', instances)

  cache.get(cache_key+'.instances', function(err, result){
    if(result){
      // Array.each(instances, function(instance){
      Object.each(instances, function(data, instance){
        if(!result.contains(instance)) result.push(instance)
      })
    }
    else
      result = Object.keys(instances)

    cache.set(cache_key+'.instances', result, CHART_INSTANCE_TTL, function(err, result){
      // debug_internals('__save_instances cache.set', err, result)

      // if(!err || err === null)
      //   this.fireEvent(this.ON_HOST_INSTANCES_UPDATED, {type: 'instances', host: cache_key, instances: instances})

      if(typeof cb == 'function')
        cb()

    })
  })
}

let __merge_transformed = function(name, stat, merge){
  name = __transform_name(name)

  let to_merge = {}
  to_merge[name] = stat
  return Object.merge(merge, to_merge)
}

let __transform_name = function(name){
  name = name.replace(/\./g, '_')
  name = name.replace(/\%/g, 'percentage_')
  return name
}

let __traverse_path_require = function(type, path, stat, original_path){
  original_path = original_path || path
  path = path.replace(/_/g, '.')
  original_path = original_path.replace(/_/g, '.')

  // debug_internals('__traverse_path_require %s', path, original_path)
  try{
    let chart = require('./libs/'+type+'/'+path)(stat, original_path)

    return chart
  }
  catch(e){
    if(path.indexOf('.') > -1){
      let pre_path = path.substring(0, path.lastIndexOf('.'))
      return __traverse_path_require(type, pre_path, stat, original_path)
    }

    return undefined
  }

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
    				 * needs 3 runs to start analyzing from last ui (or from begining)
    				 * it takes 60 secs to complete, so it makes ui each minute
    				 * @use node-cron to start on 14,29,44,59....or it would start messuring on a random timestamp
    				 * */
    				periodical: function(dispatch){
    					// return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
              return cron.schedule('* * * * * *', dispatch);//every 20 secs
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

         let output = {}
         debug_internals(doc)
         if(doc){
           Object.each(doc, function(data, host){
             __transform_data('stat', data, host, function(stat){
                __transform_data('tabular', stat, host, function(tabular){
                  output[host] = tabular
                  debug_internals(output)
                })
              })
           })
         }


       //   if(
     		// 		typeof(doc) == 'array'
     		// 		|| doc instanceof Array
     		// 		|| Array.isArray(doc)
     		// 		&& doc.length > 0 && doc[0].data && doc[0].data !== null
     		// 		&& doc[doc.length - 1] && doc[doc.length - 1].data && doc[doc.length - 1].data !== null
     		// 	){
       //
       //      let first = doc[0].metadata.timestamp;
       //
       //      // //debug_internals('doc %s %s', path, host)
       //
       //      let last = doc[doc.length - 1].metadata.timestamp;
       //
       //      let values = {};
       //
       //
       //      Array.each(doc, function(d, d_index){
       //        let path = d.metadata.path
       //        if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
       //
       //          let data = d.data
       //          let timestamp = d.metadata.timestamp;
       //
       //
       //  				let host = d.metadata.host
       //
       //  				if(!values[host]) values[host] = {};
       //
       //  				if(!values[host][path]) values[host][path] = {};
       //
       //          try{
       //            //debug_internals('HOOK path %s', path)
       //
       //            let _require = require('./hooks/'+path)
       //            if(_require)
       //              hooks[path] = _require
       //          }
       //          catch(e){
       //            // //debug_internals('no hook file for %s', path)
       //          }
       //
       //          debug_internals('HOOKs', hooks)
       //
       //          Object.each(data, function(value, key){
       //            let _key = key
       //            if(hooks[path]){
       //              Object.each(hooks[path], function(hook_data, hook_key){
       //                // if(path == 'os.blockdevices')
       //                //   //debug_internals('KEY %s %s', key, hook_key)
       //
       //                if(hook_data[hook_key] && hook_data[hook_key] instanceof RegExp){
       //                  // //debug_internals('KEY %s %s %o', key, hook_key, hook_data[hook_key])
       //
       //                  if(hook_data[hook_key].test(_key))//if regexp match
       //                    _key = hook_key
       //                }
       //                // else{
       //                //
       //                // }
       //              })
       //
       //            }
       //
       //            // if(path == 'os.procs')
       //            //   debug_internals('KEY %s %s', key, _key)
       //
       //            if(!values[host][path][key]){
       //
       //              if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].key == 'function'){
       //                values[host][path] = hooks[path][_key].key(values[host][path], timestamp, value, key)
       //
       //                if(values[host][path][key] == undefined)
       //                  delete values[host][path][key]
       //              }
       //              else{
       //                values[host][path][key] = {};
       //              }
       //            }
       //
       //
       //            if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].value == 'function'){
       //              values[host][path] = hooks[path][_key].value(values[host][path], timestamp, value, key)
       //
       //            }
       //            else{
       //              values[host][path][key][timestamp] = value;
       //
       //            }
       //
       //
       //          });
       //
       //          if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
       //            values[host][path] = hooks[path].post_values(values[host][path])
       //          }
       //
       //        }//__white_black_lists_filter
       //
       //
       //      });
       //
       //      // if(values.colo && values.colo)
       //      //   debug_internals('values %o', values.colo)
       //
       //      if(Object.getLength(values) > 0){
       //        Object.each(values, function(host_data, host){
       //
       //          let new_doc = {data: {}, metadata: {range: {start: null, end: null}}};
       //
       //          Object.each(host_data, function(data, path){
       //
       //            Object.each(data, function(value, key){
       //              let _key = key
       //              if(hooks[path]){
       //                Object.each(hooks[path], function(data, hook_key){
       //                  if(data[hook_key] && data[hook_key] instanceof RegExp){
       //                    if(data[hook_key].test(key))//if regexp match
       //                      _key = hook_key
       //                  }
       //                  // else{
       //                  //
       //                  // }
       //                })
       //
       //              }
       //
       //              // debug_internals('HOOK DOC KEY %s %s', key, _key)
       //
       //              if(hooks[path] && hooks[path][_key] && typeof hooks[path][_key].doc == 'function'){
       //                new_doc.data = hooks[path][_key].doc(new_doc.data, value, key)
       //
       //                if(path == 'os.mounts')
       //                  debug_internals('value %s %o', key, new_doc.data)
       //              }
       //              else{
       //                let data_values = Object.values(value);
       //                let min = ss.min(data_values);
       //                let max = ss.max(data_values);
       //
       //                new_doc['data'][key] = {
       //                  // samples : value,
       //                  min : min,
       //                  max : max,
       //                  mean : ss.mean(data_values),
       //                  median : ss.median(data_values),
       //                  mode : ss.mode(data_values),
       //                  range: max - min
       //                };
       //              }
       //
       //              new_doc['metadata'] = {
       //                type: 'minute',
       //                host: host,
       //                // path: 'ui.'+path,
       //                path: path,
       //                range: {
       //                  start: first,
       //                  end: last
       //                }
       //              };
       //
       //
       //
       //            });
       //
       //            sanitize_filter(
       //              new_doc,
       //              opts,
       //              pipeline.output.bind(pipeline),
       //              pipeline
       //            )
       //
       //          })
       //        });
       //
       //      }//if(Object.getLength(values) > 0)
       //
       //
       //    }
       //
       //
       },

   	],
  	// output: [
    //   {
  	// 		rethinkdb: {
  	// 			id: "output.ui.rethinkdb",
  	// 			conn: [
  	// 				{
    //           host: 'elk',
  	// 					port: 28015,
  	// 					db: 'servers',
    //           table: 'ui',
  	// 				},
  	// 			],
  	// 			module: require('js-pipeline/output/rethinkdb'),
    //       buffer:{
  	// 				size: 0,
  	// 				expire:0
  	// 			}
  	// 		}
  	// 	}
  	// ]
  }

  return conf
}
