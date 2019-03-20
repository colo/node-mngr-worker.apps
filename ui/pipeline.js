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
//
// // let hooks = {}
//
// // paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
let paths_blacklist = /^(os\.procs|os\.procs\.cmd|os\.procs\.uid|os\.networkInterfaces)$/
let paths_whitelist = undefined

let stat_blacklist = /^[a-zA-Z0-9_\.]+$/
let stat_whitelist = /^(os\.freemem|os\.cpus|os\.totalmem)$/

let tabular_blacklist = undefined
let tabular_whitelist = /^[a-zA-Z0-9_\.]+$/

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
// let RethinkDBStoreIn = require('js-caching/libs/stores/rethinkdb').input
// let RethinkDBStoreOut = require('js-caching/libs/stores/rethinkdb').output

let RedisStoreIn = require('js-caching/libs/stores/redis').input
let RedisStoreOut = require('js-caching/libs/stores/redis').output

let data_to_stat = require('node-tabular-data').data_to_stat
let data_to_tabular = require('node-tabular-data').data_to_tabular

const CHART_INSTANCE_TTL = 60000

let cache = new jscaching({
  suspended: false,
  ttl: 1999,
  stores: [
    // {
    //   id: 'rethinkdb',
    //   conn: [
    //     {
    //       host: 'elk',
    //       port: 28015,
    //       // port: 28016,
    //       db: 'servers',
    //       table: 'cache',
    //       module: RethinkDBStoreIn,
    //     },
    //   ],
    //   module: RethinkDBStoreOut,
    //   buffer:{
    //     size: -1,
    //     // expire: 0 //ms
    //     expire: 999 //ms
    //   }
    // }
    {
      id: 'redis',
      conn: [
        {
          host: 'elk',
          // port: 28015,
          // port: 28016,
          db: 0,
          // table: 'cache',
          module: RedisStoreIn,
        },
      ],
      module: RedisStoreOut,
      buffer:{
        size: -1,
        // expire: 0 //ms
        expire: 999 //ms
      }
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
  let transforms = {}
  Object.each(data, function(d, path){
    let transform = __traverse_path_require(type, path, d)

    if(transform)
      transforms[path] = transform

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
      // let transform = __traverse_path_require(type, path, d) //for each path find a transform or use "default"
      let transform = transforms[path] //for each path find a transform or use "default"

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
                // chart_instance = (chart_instance) ? JSON.parse(chart_instance) : chart
                chart_instance = (chart_instance) ? chart_instance : chart

                chart_instance = Object.merge(chart, chart_instance)

                // chart_instance = _transform(chart_instance)

                convert(d[sub_key], chart_instance, path+'.'+path_key, function(name, stat){
                  transformed = __merge_transformed(name, stat, transformed)

                  // cache.set(cache_key+'.'+type+'.'+__transform_name(path+'.'+path_key), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)
                  chart_instance = JSON.parse(JSON.stringify(chart_instance))

                  instances[__transform_name(path+'.'+path_key)] = chart_instance
                  cache.set(cache_key+'.'+type+'.'+__transform_name(path+'.'+path_key), chart_instance, CHART_INSTANCE_TTL)

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
              // chart_instance = (chart_instance) ? JSON.parse(chart_instance) : transform
              chart_instance = (chart_instance) ? chart_instance : transform

              chart_instance = Object.merge(chart_instance, transform)
              // debug_internals('chart_instance NOT FUNC %o', chart_instance)

              // debug_internals('transformed custom CACHE', cache_key+'.'+type+'.'+path)

              // throw new Error()
              convert(d, chart_instance, path, function(name, stat){
                transformed = __merge_transformed(name, stat, transformed)

                // cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)
                chart_instance = JSON.parse(JSON.stringify(chart_instance))

                instances[__transform_name(path)] = chart_instance
                cache.set(cache_key+'.'+type+'.'+__transform_name(path), chart_instance, CHART_INSTANCE_TTL)

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
        if(type == 'tabular'){ //default transform for "tabular"

          // debug_internals('transform default', path)

          // let chart = Object.clone(require('./libs/'+type)(d, path))
          let chart = require('./libs/'+type)(d, path)

          cache.get(cache_key+'.'+type+'.'+__transform_name(path), function(err, chart_instance){
            // chart_instance = (chart_instance) ? JSON.parse(chart_instance) : chart
            chart_instance = (chart_instance) ? chart_instance : chart

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

              // cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)
              chart_instance = JSON.parse(JSON.stringify(chart_instance))
              instances[__transform_name(path)] = chart_instance

              cache.set(cache_key+'.'+type+'.'+__transform_name(path), chart_instance, CHART_INSTANCE_TTL)

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
        else{//default transform for "stat"
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
          // suspended: true,
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
         // let { type, input, input_type, app } = opts

         // let output = {}
         // debug_internals(doc)

         if(doc){

           Object.each(doc, function(data, host){
             Object.each(data, function(value, path){

                let merged = false
                Array.each(value, function(row){//value are the docs, array, as if can be a range of docs
                  if(row.metadata && row.metadata.merged == true){//(merged docs: ex-> munin)
                    // debug_internals(row.metadata)
                    merged = true
                    Array.each(row.data, function(real_doc){
                      if(!data[real_doc.metadata.path]) data[real_doc.metadata.path] = []

                      data[real_doc.metadata.path].push(Object.merge({metadata: row.metadata}, real_doc))
                      debug_internals(data[real_doc.metadata.path])
                    })

                  }

                })

               if(merged == true)
                  delete data[path]
             })

             Object.each(data, function(value, path){
               if(!__white_black_lists_filter(paths_whitelist, paths_blacklist, path))
                  delete data[path]
             })

             // debug_internals(data)

             __transform_data('stat', data, host, function(stat){
                // debug_internals(stat)
                debug_internals('__transform_data -> stat', host)

                Object.each(stat, function(stat_data, stat_path){
                  // debug_internals(stat_data, stat_path)

                  Object.each(stat_data, function(stat_data_value, stat_data_path){
                    let joined_stat_path = stat_path+'.'+stat_data_path

                    if(
                      __white_black_lists_filter(stat_whitelist, stat_blacklist, joined_stat_path)
                      || __white_black_lists_filter(stat_whitelist, stat_blacklist, joined_stat_path.replace(/\./g, '_'))
                    ){
                      Array.each(stat_data_value, function(doc_data, index){
                        let new_doc = {
                          data: doc_data,
                          metadata: {
                            host: host,
                            // path: stat_path+'_'+stat_data_path,
                            path: joined_stat_path.replace(/\./g, '_'),//mngr-ui transform '_' -> '.' to query
                            timestamp: doc_data.timestamp,
                            type: 'periodical',
                            format: 'stat'
                          }
                        }

                        // debug_internals(new_doc)

                        sanitize_filter(
                          new_doc,
                          opts,
                          pipeline.output.bind(pipeline),
                          pipeline
                        )

                      })
                    }

                  })


                })


                __transform_data('tabular', stat, host, function(tabular){
                  // output[host] = tabular
                  // debug_internals('__transform_data -> tabular', tabular)
                  debug_internals('__transform_data -> tabular', host)
                  //
                  // if(output[host].os_uptime)
                  //   debug_internals(output[host].os_uptime)
                  Object.each(tabular, function(tabular_data, tabular_path){

                    if(__white_black_lists_filter(tabular_whitelist, tabular_blacklist, tabular_path)){
                      Array.each(tabular_data, function(doc_data){
                        let new_doc = {
                          data: doc_data,
                          metadata: {
                            host: host,
                            path: tabular_path,
                            // path: path.replace(/_/g, '.'),//mngr-ui transform '_' -> '.' to query
                            timestamp: doc_data[0],
                            type: 'periodical',
                            format: 'tabular'
                          }
                        }

                        // debug_internals(new_doc)

                        sanitize_filter(
                          new_doc,
                          opts,
                          pipeline.output.bind(pipeline),
                          pipeline
                        )

                      })
                    }



                  })
                }) //_transform 'tabular'
              }) //_transform 'stat'
           })
         }


       },

   	],
  	output: [
      // function(doc){
      //   debug_internals(doc)
      // }
      {
  			rethinkdb: {
  				id: "output.ui.rethinkdb",
  				conn: [
  					{
              host: 'elk',
  						port: 28015,
              // port: 28016,
  						db: 'servers',
              table: 'ui',
  					},
  				],
  				module: require('js-pipeline/output/rethinkdb'),
          buffer:{
            size: -1,
  					// expire: 0,
            // periodical: 100 //how often will check if buffer timestamp has expire
  					// size: -1,
  					expire: 999,
            // periodical: 100 //how often will check if buffer timestamp has expire
  				}
  			}
  		}
  	]
  }

  return conf
}
