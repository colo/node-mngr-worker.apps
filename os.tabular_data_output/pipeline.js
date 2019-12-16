'use strict'

var debug = require('debug')('Server:Apps:OS:Pipeline');
var debug_internals = require('debug')('Server:Apps:OS:Pipeline:Internals');

const path = require('path');

let cron = require('node-cron');

let procs_filter = require('./filters/proc'),
    networkInterfaces_filter = require('./filters/networkInterfaces'),
    blockdevices_filter = require('./filters/blockdevices'),
    cpus_filter = require('./filters/cpus'),
    mounts_filter = require('./filters/mounts'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template')),
    compress_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zlib.compress'))

    // zipson_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.zipson'))
    // lzutf8_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzutf8.compress'))
    // lzstring_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.lzstring.compress'))


let PollHttp = require('js-pipeline/input/poller/poll/http')

let OSPollHttp = require('node-app-http-client/load')(PollHttp)
let ProcsPollHttp = require('node-app-http-client/load')(PollHttp)

// let modules = {}
// let all_modules = {
//   'os': false,
//   'os.procs': false,
//   // 'os.procs.stats': false,
//   'os.procs.uid': false,
//   // 'os.procs.uid.stats': false,
//   'os.procs.cmd': false,
//   // 'os.procs.cmd.stats': false,
//   'os.mounts': false,
//   'os.blockdevices': false,
//   'os.networkInterfaces': false,
//   // 'os.networkInterfaces.stats': false
// }

// let meta_doc = { id: '', data: [], metadata: { path: 'os.merged', type: 'periodical', merged: true }}
// let meta_docs = {}

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

let eachOf = require( 'async' ).eachOf

const ID = 'ea77ccca-4aa1-448d-a766-b23efef9c12b'

let data_to_stat = require('node-tabular-data').data_to_stat
let data_to_tabular = require('node-tabular-data').data_to_tabular

const data_formater = function(data, format, cb){
  debug('data_formater FUNC %s %o', format, data)
  // process.exit(1)
  if(format && data && (data.length > 0 || Object.getLength(data) > 0)){

    if(format === 'merged'){
      if(Array.isArray(data) && Array.isArray(data[0])){//array of array
        // process.exit(1)
        for(let i = 0; i < data.length; i++){
          data[i] = merge_result_data(data[i])
        }
      }
      else{
        data = merge_result_data(data)
      }

      cb(data)
    }
    else{

      // let stat = {}
      // stat['data'] = (!Array.isArray(data)) ? [data] : data


      data = (!Array.isArray(data)) ? [data] : data
      /**
      * data should be array of arrays (each array is a grouped path)
      * when index=false is used, data isn't grouped, so we groupe it here
      *
      **/
      if(!Array.isArray(data[0])){
        // let tmp_data = []
        let tmp_obj = {}
        Array.each(data, function(value, key){
          // tmp_data.push([value])
          if(value && value.metadata && value.metadata.path){
            if(!tmp_obj[value.metadata.path]) tmp_obj[value.metadata.path] = []
            tmp_obj[value.metadata.path].push(value)
          }
        })

        data = []
        Object.each(tmp_obj, function(value){
          data.push(value)
        })
      }

      debug('FORMAT %o', data)
      // process.exit(1)


      // let stat_counter = 0
      // let not_equal_length = true

      let transformed = {}

      eachOf(data, function (value, key, callback) {
        key = (value[0] && value[0].metadata && value[0].metadata.path) ? value[0].metadata.path : key
        let stat = {}
        stat['data'] = value
        __transform_data('stat', '', stat, ID, function(value){
          // transformed[key] = (value && value.stat) ? value.stat : undefined
          transformed[key] = (value && value.stat && value.stat.data) ? value.stat.data : undefined
          callback()
        })
      }.bind(this), function (err) {

        data = transformed

        debug('FORMAT trasnformed %O', transformed)
        // process.exit(1)
        // if( format == 'tabular' && !err && value.stat['data'] && (value.stat['data'].length > 0 || Object.getLength(value.stat['data']) > 0)){
        // if( format == 'tabular' && data.length > 0){
        if( format == 'tabular' && Object.getLength(data) > 0){
          // let transformed = []
          let transformed = {}

          eachOf(data, function (value, key, callback) {
            // debug_internals(': __transform_data tabular -> %o %s', value, key) //result
            // process.exit(1)
            // if(value && value.data && (value.data.length > 0 || Object.getLength(value.data))){
            if(value && (value.length > 0 || Object.getLength(value))){
              // let stat = {}
              // stat['data'] = value

              // __transform_data('tabular', 'data', value.data, id, function(value){
              __transform_data('tabular', 'data', value, ID, function(value){
                debug_internals(': __transform_data tabular -> %o', value) //result
                transformed[key] = value
                callback()
              }.bind(this))
            }
            else{
              // transformed[key] = undefined
              callback()
            }
          }.bind(this), function(err){
            data = transformed

            cb(data)
          }.bind(this))

        }
        else{

          cb(data)
        }

      }.bind(this))


    }


  }
  else{
    cb(data)
  }
}

const __transform_data = function(type, data_path, data, cache_key, cb){
  debug_internals('__transform_data', type, data_path, data)

  let convert = (type == 'stat') ? data_to_stat : data_to_tabular

  let transformed = {}
  transformed[type] = {}

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
    let transform = __traverse_path_require(type, (data_path && data_path !== '') ? data_path+'.'+path : path, d)

    if(transform && typeof transform == 'function'){
      transform_result_length += Object.getLength(transform(d))
    }
    // else if(transform){
      transform_result_length++
    // }
  }.bind(this))

  let transform_result_counter = 0

  Object.each(data, function(d, path){

    debug_internals('DATA', d, type, path)

    if(d && d !== null){
      if (d[0] && d[0].metadata && d[0].metadata.format && d[0].metadata.format == type){

        // if(!d[0].metadata.format[type]){
        let formated_data = []
        Array.each(d, function(_d){ formated_data.push(_d.data) })
        transformed[type] = __merge_transformed(__transform_name(path), formated_data, transformed[type])
        // }

        if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
          cb(transformed)

      }
      else if (
        (d[0] && d[0].metadata && !d[0].metadata.format && type == 'stat')
        || (d[0] && !d[0].metadata && type == 'tabular')
      ){
        let transform = __traverse_path_require(type, (data_path && data_path !== '') ? data_path+'.'+path : path, d) //for each path find a transform or use "default"

        // debug_internals('__transform_data', d)
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
                    transformed[type] = __merge_transformed(name, stat, transformed[type])
                    // name = name.replace(/\./g, '_')
                    // let to_merge = {}
                    // to_merge[name] = stat
                    //
                    // transformed = Object.merge(transformed, to_merge)
                    //
                    // debug_internals('chart_instance CACHE %o', name, transform_result_counter, transform_result_length)


                    // chart_instance = cache.clean(chart_instance)
                    // // debug_internals('transformed func', name, JSON.stringify(chart_instance))
                    // instances.push(__transform_name(path+'.'+path_key))
                    instances[__transform_name(path+'.'+path_key)] = chart_instance

                    /**
                    * race condition between this app && ui?
                    **/
                    // cache.set(cache_key+'.'+type+'.'+__transform_name(path+'.'+path_key), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)

                    if(
                      transform_result_counter == transform_result_length - 1
                      && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                    ){
                      /**
                      * race condition between this app && ui?
                      **/
                      // __save_instances(cache_key, instances, cb.pass(transformed[type]))
                      cb(transformed[type])
                    }

                    transform_result_counter++
                  }.bind(this))



                }.bind(this))
              }
              else{
                convert(d[sub_key], chart, path+'.'+path_key, function(name, stat){
                  transformed[type] = __merge_transformed(name, stat, transformed[type])
                  // name = name.replace(/\./g, '_')
                  // let to_merge = {}
                  // to_merge[name] = stat
                  //
                  // debug_internals('transformed func', name, stat)
                  //
                  // transformed = Object.merge(transformed, to_merge)

                  if(
                    transform_result_counter == transform_result_length - 1
                    && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                  ){
                    cb(transformed)
                  }


                  transform_result_counter++
                })

              }





            }.bind(this))
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
                  transformed[type] = __merge_transformed(name, stat, transformed[type])
                  // name = name.replace(/\./g, '_')
                  // let to_merge = {}
                  // to_merge[name] = stat
                  //
                  // debug_internals('transformed custom CACHE', cache_key+'.'+type+'.'+path, transformed)

                  // transformed = Object.merge(transformed, to_merge)

                  // chart_instance = cache.clean(chart_instance)

                  // instances.push(__transform_name(path))


                  instances[__transform_name(path)] = chart_instance
                  /**
                  * race condition between this app && ui?
                  **/
                  // cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)


                  if(
                    transform_result_counter == transform_result_length - 1
                    && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                  ){
                    /**
                    * race condition between this app && ui?
                    **/
                    // __save_instances(cache_key, instances, cb.pass(transformed[type]))
                    cb(transformed[type])
                  }

                  transform_result_counter++

                }.bind(this))



              }.bind(this))
            }
            else{
              convert(d, transform, path, function(name, stat){
                transformed[type] = __merge_transformed(name, stat, transformed[type])

                // name = name.replace(/\./g, '_')
                // let to_merge = {}
                // to_merge[name] = stat
                //
                // debug_internals('transformed custom', type, to_merge)
                //
                // transformed = Object.merge(transformed, to_merge)

                if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
                  cb(transformed)

              }.bind(this))
            }

          }


        }
        else{//default
          if(type == 'tabular'){ //default transform for "tabular"

            // debug_internals('transform default tabular', path)

            let chart = Object.clone(require(process.cwd()+'/apps/os/libs/'+type)(d, path))

            cache.get(cache_key+'.'+type+'.'+__transform_name(path), function(err, chart_instance){
              // chart_instance = (chart_instance) ? JSON.parse(chart_instance) : chart
              chart_instance = (chart_instance) ? chart_instance : chart

              chart_instance = Object.merge(chart, chart_instance)

              // debug_internals('transform default tabular', d, path)


              convert(d, chart_instance, path, function(name, stat){
                // debug_internals('transform default tabular %s %o', name, stat)
                // if(type !== 'stat')
                //   process.exit(1)

                /**
                * clean stats that couldn't be converted with "data_to_tabular"
                **/
                Array.each(stat, function(val, index){
                  Array.each(val, function(row, i_row){
                    if(isNaN(row) && typeof row !== 'string')
                      val[i_row] = undefined
                  })
                  stat[index] = val.clean()
                  if(stat[index].length <= 1)
                    stat[index] = undefined
                })
                stat = stat.clean()

                // debug_internals('transform default tabular', name, stat)

                if(stat.length > 0)
                  transformed[type] = __merge_transformed(name, stat, transformed[type])


                // name = name.replace(/\./g, '_')
                // let to_merge = {}
                // to_merge[name] = stat
                //
                // transformed = Object.merge(transformed, to_merge)
                // debug_internals('default chart_instance CACHE %o', name)

                // debug_internals('default chart_instance CACHE %o', name, transform_result_counter, transform_result_length)
                // chart_instance = cache.clean(chart_instance)
                // // debug_internals('transformed func', name, JSON.stringify(chart_instance))
                // instances.push(__transform_name(path))
                instances[__transform_name(path)] = chart_instance

                /**
                * race condition between this app && ui?
                **/
                // cache.set(cache_key+'.'+type+'.'+__transform_name(path), JSON.stringify(chart_instance), CHART_INSTANCE_TTL)

                debug_internals('transform default tabular %d', transform_result_counter, transform_result_length, counter, Object.getLength(data), typeof cb == 'function', (
                  transform_result_counter == transform_result_length - 1
                  && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                ))
                if(
                  transform_result_counter == transform_result_length - 1
                  && (counter >= Object.getLength(data) - 1 && typeof cb == 'function')
                ){

                  /**
                  * race condition between this app && ui?
                  **/
                  // __save_instances(cache_key, instances, cb.pass(transformed[type]))
                  cb(transformed[type])
                }

                transform_result_counter++
              }.bind(this))



            }.bind(this))
          }
          else{//default transform for "stat"
            require(process.cwd()+'/apps/os/libs/'+type)(d, path, function(name, stat){
              transformed[type] = __merge_transformed(name, stat, transformed[type])
              // name = name.replace(/\./g, '_')
              // let to_merge = {}
              // to_merge[name] = stat
              // debug_internals('transformed default', type, to_merge)
              // transformed = Object.merge(transformed, to_merge)

              // debug_internals('transform default', d, path)

              if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
                cb(transformed)

            }.bind(this))
          }


        }

        // if(counter == Object.getLength(data) - 1 && typeof cb == 'function')
        //   cb(transformed)

      }
      else if(counter == Object.getLength(data) - 1 && typeof cb == 'function'){
          cb(transformed)
      }

    }//end if(d && d !== null)
    else if(counter == Object.getLength(data) - 1 && typeof cb == 'function'){
        cb(transformed)
    }

    counter++
  }.bind(this))


}

const merge_result_data = function(data){
  debug('merge_result_data')
  let newData
  if(Array.isArray(data)){
    debug('merge_result_data TO MERGE ARRAY', data)
    newData = data.shift()

    for(const i in data){
      newData = deep_object_merge(newData, data[i])
    }
  }
  else if(typeof data === 'object' && data.constructor === Object && Object.keys(data).length > 0){
    newData = {}
    // debug('merge_result_data TO MERGE', data)
    for(const i in data){
      debug('merge_result_data TO MERGE', i, data[i])
      newData[i] = merge_result_data(data[i])
    }
  }
  else{
    newData = data
  }

  debug('merge_result_data MERGED', newData)

  return newData
}

const deep_object_merge = function(obj1, obj2){
  // debug('deep_object_merge %o %o', obj1, obj2)

  let merged = (obj1) ?  Object.clone(obj1): {}

  for(const key in obj2){
    if(!obj1[key]){
      obj1[key] = obj2[key]
    }
    else if(obj2[key] !== null && obj1[key] !== obj2[key]){
      if(typeof obj2[key] === 'object' && obj2[key].constructor === Object && Object.keys(obj2[key]).length > 0){
        merged[key] = deep_object_merge(merged[key], obj2[key])

        // if(Object.keys(merged).length === 0)
        //   delete merged[key]

      }
      else if(Array.isArray(merged[key]) && Array.isArray(obj2[key])){
        merged[key].combine(obj2[key])
      }
      // else if( Object.keys(obj2[key]).length > 0 ){
      else {
        if(!Array.isArray(merged[key])){
          let tmpVal = merged[key]
          merged[key] = []
        }

        merged[key].include(obj2[key])
      }

    }


  }


  return merged
}

const __traverse_path_require = function(type, path, stat, original_path){
  original_path = original_path || path
  path = path.replace(/_/g, '.')
  original_path = original_path.replace(/_/g, '.')

  debug_internals('__traverse_path_require %s', process.cwd()+'/apps/os/libs/'+type+'/'+path)

  try{
    let chart = require(process.cwd()+'/apps/os/libs/'+type+'/'+path)(stat, original_path)

    return chart
  }
  catch(e){
    if(path.indexOf('.') > -1){
      let pre_path = path.substring(0, path.lastIndexOf('.'))
      return __traverse_path_require(type, pre_path, stat, original_path)
    }

    return undefined
  }


  // let path = path.split('.')
  // if(!Array.isArray(path))
  //   path = [path]
  //
  // Array.each()
}

const __merge_transformed = function(name, stat, merge){
  name = __transform_name(name)

  let to_merge = {}
  to_merge[name] = stat
  return Object.merge(merge, to_merge)
}

const __transform_name = function(name){
  name = name.replace(/\./g, '_')
  name = name.replace(/\%/g, 'percentage_')
  return name
}

const jscaching = require('js-caching')

let RedisStoreIn = require('js-caching/libs/stores/redis').input
let RedisStoreOut = require('js-caching/libs/stores/redis').output


let cache = new jscaching({
  NS: 'a22cf722-6ea9-4396-b2b3-9440dd677dd0',
  id: 'ui.cache',
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
    // }
    {
      NS: 'a22cf722-6ea9-4396-b2b3-9440dd677dd0',
      id: 'ui.cache',
      conn: [
        // Object.merge(
        //   // Object.clone(require(ETC+'default.redis')),
        //   {
        //     module: RedisStoreIn,
        //   },
        // )
        {
        	host: 'elk',
        	db: 0,
        	channel: 'ui',
          module: RedisStoreIn,
        }

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

module.exports = function(http, out){
  let conf = {
   input: [
  	{
  		poll: {
  			id: "input.localhost.os.http",
  			conn: [
          Object.merge(
            Object.clone(http),
            {
              module: OSPollHttp,
              load: ['apps/os/input/os']
            },
          )
  				// {
  				// 	scheme: 'http',
  				// 	host:'elk',
  				// 	port: 8081,
  				// 	module: OSPollHttp,
  				// 	// load: ['apps/info/os/']
          //   load: ['apps/os/input/os']
  				// },
          // {
  				// 	scheme: 'http',
  				// 	host:'dev',
  				// 	port: 8081,
  				// 	module: OSPollHttp,
  				// 	// load: ['apps/info/os/']
          //   load: ['apps/os/input/os']
  				// }
  			],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
  			requests: {
  				// periodical: 1000,
          periodical: function(dispatch){
            // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
            return cron.schedule('* * * * * *', dispatch);//every 20 secs
          },
  			},
  		},
  	},

    {
  		poll: {
  			id: "input.localhost.os.procs.http",
  			conn: [
          Object.merge(
            Object.clone(http),
            {
              module: ProcsPollHttp,
              load: ['apps/os/input/procs']
            },
          )
  				// {
  				// 	scheme: 'http',
  				// 	host:'elk',
  				// 	port: 8081,
  				// 	module: ProcsPollHttp,
          //   load: ['apps/os/input/procs']
  				// },
          // {
  				// 	scheme: 'http',
  				// 	host:'dev',
  				// 	port: 8081,
  				// 	module: ProcsPollHttp,
          //   load: ['apps/os/input/procs']
  				// }
  			],
        connect_retry_count: -1,
        connect_retry_periodical: 1000,
  			requests: {
  				periodical: 250,//ms
          // periodical: function(dispatch){
          //   // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
          //   return cron.schedule('* * * * * *', dispatch);//every 20 secs
          // },
  			},
  		},
  	},
    // {
  	// 	poll: {
  	// 		id: "input.elk.os.http",
  	// 		conn: [
    //       Object.merge(
    //         Object.clone(http),
    //         {
    //           host: 'elk',
    //           module: OSPollHttp,
    //           load: ['apps/os/input/os']
    //         },
    //       )
  	// 			// {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'elk',
  	// 			// 	port: 8081,
  	// 			// 	module: OSPollHttp,
  	// 			// 	// load: ['apps/info/os/']
    //       //   load: ['apps/os/input/os']
  	// 			// },
    //       // {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'dev',
  	// 			// 	port: 8081,
  	// 			// 	module: OSPollHttp,
  	// 			// 	// load: ['apps/info/os/']
    //       //   load: ['apps/os/input/os']
  	// 			// }
  	// 		],
    //     connect_retry_count: -1,
    //     connect_retry_periodical: 1000,
  	// 		requests: {
  	// 			// periodical: 1000,
    //       periodical: function(dispatch){
    //         // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
    //         return cron.schedule('* * * * * *', dispatch);//every 20 secs
    //       },
  	// 		},
  	// 	},
  	// },

    // {
  	// 	poll: {
  	// 		id: "input.elk.os.procs.http",
  	// 		conn: [
    //       Object.merge(
    //         Object.clone(http),
    //         {
    //           host: 'elk',
    //           module: ProcsPollHttp,
    //           load: ['apps/os/input/procs']
    //         },
    //       )
  	// 			// {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'elk',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// },
    //       // {
  	// 			// 	scheme: 'http',
  	// 			// 	host:'dev',
  	// 			// 	port: 8081,
  	// 			// 	module: ProcsPollHttp,
    //       //   load: ['apps/os/input/procs']
  	// 			// }
  	// 		],
    //     connect_retry_count: -1,
    //     connect_retry_periodical: 1000,
  	// 		requests: {
  	// 			periodical: 1000,//ms
    //       // periodical: function(dispatch){
    //       //   // return cron.schedule('14,29,44,59 * * * * *', dispatch);//every 15 secs
    //       //   return cron.schedule('* * * * * *', dispatch);//every 20 secs
    //       // },
  	// 		},
  	// 	},
  	// },
   ],
   filters: [
  		// require('./snippets/filter.sanitize.template'),
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts

        let host = input_type.options.id
        let module = app.options.id

        // console.log('os filter',doc)
        // debug(app.options.id)

        // if(app.options.id == 'os.procs'){
        if(app.options.id == 'procs'){

          procs_filter(
            doc,
            opts,
            next,
            pipeline
          )
        }
        else{
          if(doc && doc.uptime)
            pipeline.current_uptime = doc.uptime

          if(doc && doc.networkInterfaces){//create an extra doc for networkInterfaces
            networkInterfaces_filter(
              doc.networkInterfaces,
              opts,
              next,
              pipeline
            )

            delete doc.networkInterfaces

          }

          debug('app.options.id %s', app.options.id)
          if(app.options.id === 'os.mounts'){
            debug('MOUNTS %O', doc)

            mounts_filter(
              doc,
              opts,
              next,
              pipeline
            )

            // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[0]))}}
            //
            // next(doc)
          }
          else if(app.options.id === 'os.blockdevices'){
            blockdevices_filter(
              doc,
              opts,
              next,
              pipeline
            )

            // debug('blockdevices %O', Object.keys(doc[Object.keys(doc)[0]]))
            // // process.exit(1)
            // Object.each(doc, function(_doc, device){
            //   next({data: _doc, metadata: {host: host, path: module+'.'+device, tag: ['os', 'blockdevices', device].combine(Object.keys(_doc))}})
            // })
            // // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc[Object.keys(doc)[0]]))}}
            // //
            // // next(doc)
          }
          else{



            let memdoc = {data: {}, metadata: {host: host, path: module+'.memory', tag: ['os']}}
            Object.each(doc, function(_doc, key){
              if(/mem/.test(key)){
                memdoc.metadata.tag.push(key)
                memdoc.data[key] = _doc
              }
              else if(key === 'cpus'){
                cpus_filter(
                  _doc,
                  opts,
                  next,
                  pipeline
                )
              }
              else if(key === 'loadavg'){
                let _tmp = Array.clone(_doc)
                _doc = {
                  '1_min': _tmp[0],
                  '5_min': _tmp[1],
                  '15_min': _tmp[2]
                }

                next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
              }
              else if(key === 'uptime'){
                let _tmp = _doc
                _doc = {
                  seconds: _tmp
                }

                next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
              }
              else{
                next( {data: _doc, metadata: {host: host, path: module+'.'+key, tag: ['os', key]}} )
              }
            })

            if(Object.getLength(memdoc.data) > 0){
              next(memdoc)
            }
            // doc = {data: doc, metadata: {host: host, path: module, tag: ['os'].combine(Object.keys(doc))}}
          }

          // next(doc)

        }

        // debug_internals(input_type.options.id)

      },

      /**
      * not merge
      **/
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts



        let timestamp = roundMilliseconds(Date.now())
        doc.id = doc.metadata.host+'.'+doc.metadata.path+'@'+timestamp
        doc.metadata.timestamp = timestamp

        debug('last filter %o', doc)
        data_formater(doc, 'tabular', function(data){
          debug('result %o', data)
          let key = Object.keys(data)[0]
          doc.data = data[key]
          doc.metadata.format = 'tabular'
          sanitize_filter(
            doc,
            opts,
            pipeline.output.bind(pipeline),
            pipeline
          )
          // process.exit(1)
        })



        // if(!modules[host]) modules[host] = Object.clone(all_modules)
        //
        // modules[host][module] = true
        //
        // debug_internals('merge', host, module, modules[host])
        //
        // if(!meta_docs[host]) meta_docs[host] = Object.clone(meta_doc)
        //
        // meta_docs[host].data.push(doc)
        // meta_docs[host].id = host+'.os.merged@'+Date.now()
        // meta_docs[host].metadata['host'] = host
        //
        // if(Object.every(modules[host], function(val, mod){ return val })){
        //   // debug_internals('META %o', meta_docs[host])
        //   // meta_docs[host].data = JSON.stringify(meta_docs[host].data)
        //   sanitize_filter(
        //     Object.clone(meta_docs[host]),
        //     opts,
        //     pipeline.output.bind(pipeline),
        //     pipeline
        //   )
        //
        //   meta_docs[host].data = []
        //   Object.each(modules[host], function(val, mod){ modules[host][mod] = false })
        //
        // }


      },

      /**
      * merge
      **/

      // function(doc, opts, next, pipeline){
      //   let { type, input, input_type, app } = opts
      //
      //
      //   let host = doc.metadata.host
      //   let module = doc.metadata.path
      //
      //   if(!modules[host]) modules[host] = Object.clone(all_modules)
      //
      //   modules[host][module] = true
      //
      //   if(!meta_docs[host]) meta_docs[host] = Object.clone(meta_doc)
      //
      //   meta_docs[host].data.push(doc)
      //   meta_docs[host].id = host+'.os.merged@'+Date.now()
      //   meta_docs[host].metadata['host'] = host
      //
      //   debug_internals('merge', host, module, modules[host])
      //
      //   if(Object.every(modules[host], function(val, mod){ return val })){
      //     debug_internals('META %o', meta_docs[host])
      //     // meta_docs[host].data = JSON.stringify(meta_docs[host].data)
      //     sanitize_filter(
      //       Object.clone(meta_docs[host]),
      //       opts,
      //       pipeline.output.bind(pipeline),
      //       pipeline
      //     )
      //
      //     meta_docs[host].data = []
      //     Object.each(modules[host], function(val, mod){ modules[host][mod] = false })
      //
      //   }
      //
      //
      // }

  	],
  	output: [
      // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
  		//require('./snippets/output.stdout.template'),
  		// {
  		// 	cradle: {
  		// 		id: "output.os.cradle",
  		// 		conn: [
  		// 			{
  		// 				host: 'elk',
  		// 				port: 5984,
  		// 				db: 'live',
  		// 				opts: {
  		// 					cache: false,
  		// 					raw: false,
  		// 					forceSave: false,
  		// 				},
  		// 			},
  		// 		],
  		// 		module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
      //     buffer:{
  		// 			size: 0,
  		// 			expire:0
  		// 		}
  		// 	}
  		// }
      {
  			rethinkdb: {
  				id: "output.os.rethinkdb",
  				conn: [
            Object.merge(
              Object.clone(out),
              {table: 'os'}
            )
  				],
  				module: require('js-pipeline/output/rethinkdb'),
          buffer:{
  					// // size: 1, //-1
  					// expire: 1001,
            size: -1, //-1
  					// expire: 0 //ms
            expire: 1000, //ms
            periodical: 999 //how often will check if buffer timestamp has expire
  				}
  			}
  		}
  	]
  }

  return conf
}
