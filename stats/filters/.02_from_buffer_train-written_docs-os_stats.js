'use strict'

let debug = require('debug')('Server:Apps:Stat:Periodical:Filters:02_from_buffer_train-written_docs-os_stats');
let debug_internals = require('debug')('Server:Apps:Stat:Periodical:Filters:02_from_buffer_train-written_docs-os_stats:Internals');
let ss = require('simple-statistics');

const path = require('path')

const traverse_path_require = require('node-tabular-data').traverse_path_require

const brain = require('brain.js');

// const value_to_data = require('../../libs/value.data')


let sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.rethinkdb.template'));
const hooks_path = path.join(process.cwd(), '/apps/stats/hooks/')

// paths_blacklist = /os_procs_cmd_stats|os_procs_stats|os_networkInterfaces_stats|os_procs_uid_stats/
// let paths_blacklist = /^[a-zA-Z0-9_\[\.]+$/
let paths_blacklist = /^.+$/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
let paths_whitelist = /^os\.cpus|^os\.rethinkdb\.server\.read_docs|^os\.cpus|^os\.rethinkdb\.server\.written_docs|^os\.blockdevices\.vda3\.sectors|^os\.blockdevices\.vda3\.time/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^munin/

let hosts_blacklist = /^.+$/
// let paths_whitelist = /^os$|^os\.networkInterfaces$|^os\.blockdevices$|^os\.mounts$|^os\.procs$|^os\.procs\.uid$|^os\.procs\.cmd$|^munin|^logs/
let hosts_whitelist = /^elk$/

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


const stat = require('../libs/stat')

// let traversed_path_require = {}
//
// const __traverse_path_require = function(type, require_path, path, stat, original_path){
//   original_path = original_path || path
//   path = path.replace(/_/g, '.')
//   original_path = original_path.replace(/_/g, '.')
//
//   debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)
//
//   if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] !== undefined){
//     return traversed_path_require[require_path+'/'+type+'/'+path]
//   }
//   else if(traversed_path_require[require_path+'/'+type+'/'+path] && traversed_path_require[require_path+'/'+type+'/'+path] === undefined){
//     if(path.indexOf('.') > -1){
//       let pre_path = path.substring(0, path.lastIndexOf('.'))
//       if(traversed_path_require[require_path+'/'+type+'/'+pre_path] !== undefined){
//         let chart = __traverse_path_require(type, pre_path, stat, original_path)
//         traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
//         return chart
//       }
//     }
//     return undefined
//   }
//   else{
//
//     debug_internals('__traverse_path_require %s',  require_path+'/'+type+'/'+path)
//
//     try{
//       let chart = require(require_path+'/'+type+'/'+path)(stat, original_path)
//       traversed_path_require[require_path+'/'+type+'/'+path] = chart
//       return chart
//     }
//     catch(e){
//       debug_internals('__traverse_path_require error %o',  e)
//
//       traversed_path_require[require_path+'/'+type+'/'+path] = undefined
//       if(path.indexOf('.') > -1){
//         let pre_path = path.substring(0, path.lastIndexOf('.'))
//         let chart = __traverse_path_require(type, require_path, pre_path, stat, original_path)
//         traversed_path_require[require_path+'/'+type+'/'+pre_path] = chart
//         return chart
//       }
//
//       return undefined
//     }
//
//   }
//
//
//   // let path = path.split('.')
//   // if(!Array.isArray(path))
//   //   path = [path]
//   //
//   // Array.each()
// }

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const roundSeconds = function(timestamp){
  timestamp = roundMilliseconds(timestamp)
  let d = new Date(timestamp)
  d.setSeconds(0)

  return d.getTime()
}

const roundMinutes = function(timestamp){
  timestamp = roundSeconds(timestamp)
  let d = new Date(timestamp)
  d.setMinutes(0)

  return d.getTime()
}
const roundHours = function(timestamp){
  timestamp = roundMinutes(timestamp)
  let d = new Date(timestamp)
  d.setHours(0)

  return d.getTime()
}

const shuffle = function (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const min_max = function (data, column) {
  let min, max
  Array.each(data, function (d) {
    let col = d[column]

    min = (min === undefined || min > col) ? col : min
    max = (max === undefined || max < col) ? col : max
  })

  return { min, max }
}

const normalize = function (value, min, max) {
  return (value - min) / (max - min)
}

const denormalize = function (value, min, max) {
  return (value * (max - min)) + min
}

const new_doc_template = {data: {}, metadata: {path: 'brainjs[rethinkdb.docs][server.performance]', tag: ['brainjs', 'ml'], range: {start: null, end: null}}};


module.exports = function(payload){
  let {input, output, opts } = payload
  let type = input.type
  let full_range = input.full_range
  let table = input.table

  // const stat = require('../libs/stat')[type]

  let trainData = []
  let testData = []
  let final_docs = []
  let new_doc = Object.clone(new_doc_template)
  new_doc.metadata.type = type

  let read = {min: undefined, max: undefined}
  let written = {min: undefined, max: undefined}
  let sectors = {min: undefined, max: undefined}
  let queue = {min: undefined, max: undefined}
  let idle = {min: undefined, max: undefined}

  const netOptions = {
    activation: 'sigmoid', // activation function
    hiddenLayers: [3,4],
    // learningRate: 0.01, // global learning rate, useful when training using streams
    outputSize: 3,
  }

  let net = new brain.NeuralNetwork(netOptions)

  const readInputs = function (stream, data) {
    // debug('readInputs', data)
    for (let i = 0; i < data.length; i++) {
      stream.write(data[i]);
    }
    // let it know we've reached the end of the inputs
    stream.endInputs();
  }

  const accuracy = function (net, testData) {
    let hits = 0
    testData.forEach((datapoint) => {
      const output = net.run(datapoint.input)

      // debug('accuracy', datapoint.input, output, datapoint.output)
      if (Math.round(output[0]) === Math.round(datapoint.output[0]) && Math.round(output[1]) === Math.round(datapoint.output[1]) && Math.round(output[2]) === Math.round(datapoint.output[2])) {
        hits += 1
      }

    })
    return hits / testData.length
  }

  let filter = function(buffer, opts, next, pipeline){
    // debug('3rd filter %o', buffer)
    // process.exit(1)

    const trainingStream = new brain.TrainStream({
      iterations: 2000, // the maximum times to iterate the training data --> number greater than 0
      errorThresh: 0.001, // the acceptable error percentage from training data --> number between 0 and 1
      // log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
      // logPeriod: 100, // iterations between logging out --> number greater than 0
      // learningRate: 0.5, // scales with delta to effect training rate --> number between 0 and 1
      // learningRate: 0.01,

      neuralNetwork: net,
      /**
       * Write training data to the stream. Called on each training iteration.
       */
      floodCallback: function() {
        // debug('floodCallback')
        // process.exit(1)
        readInputs(trainingStream, trainData);
      },

      /**
       * Called when the network is done training.
       */
      doneTrainingCallback: function(obj) {
        let _accuracy = accuracy(net, testData)

        debug('doneTrainingCallback %o - net %o - testData %o - accuracy %d', obj, net.toJSON(), testData, _accuracy) //,

        let forecast = [[1, 2000], [140000, 1], [140000, 2000]] // normal delete - this read - this read + normal delete
        let forecastData = forecast.map(d => {
          return [normalize(d[0], read.min, read.max), normalize(d[1], written.min, written.max)]
        })

        forecastData.forEach((datapoint) => {
          debug('RUN datapoint', datapoint)
          let output = net.run(datapoint)
          debug('RUN forecast %o - sectors %d - queue %d - idle %d', output, denormalize(output[0], sectors.min, sectors.max), denormalize(output[1], queue.min, queue.max), denormalize(output[2], idle.min, idle.max))
        })


        // let forecast = [[2000]]
        // let forecastData = forecast.map(d => {
        //   return [normalize(d[0], written.min, written.max)]
        // })

        // forecastData.forEach((datapoint) => {
        //   debug('RUN datapoint', datapoint)
        //   let output = net.run(datapoint)
        //   debug('RUN forecast %o - sectors %d - queue %d - idle %d', output, denormalize(output[0], sectors.min, sectors.max), denormalize(output[1], queue.min, queue.max), denormalize(output[2], idle.min, idle.max))
        // })

        new_doc.data.inputs = [read, written]
        new_doc.data.outputs = [sectors, queue, idle]
        new_doc.data.accuracy = _accuracy
        new_doc.data.net = net.toJSON()
        net = net.fromJSON(new_doc.data.net)

        // let new_doc = {data: {}, metadata: {tag: ['brainjs', 'ml'], range: {start: null, end: null}}};

        /**
        * add other metadata fields like "domain" for logs
        */
        // new_doc['metadata'] = Object.merge(new_doc['metadata'], {
        //   type: type,
        //   host: host,
        //   path: path,
        //   range: {
        //     start: first,
        //     end: last
        //   }
        // })

        // delete new_doc['metadata'].id

        let round
        if(type === 'second'){
          round = roundMilliseconds
        }
        else if(type === 'minute'){
          round = roundSeconds
        }
        else if(type === 'hour'){
          round = roundMinutes
        }

        new_doc['metadata'].timestamp = round(new_doc.metadata.range.end)

        new_doc.id = new_doc.metadata.host+
          '.'+new_doc.metadata.type+'.'+
          new_doc.metadata.path
          // +'@'+
          // new_doc.metadata.range.start+'-'+
          // new_doc.metadata.range.end

        new_doc['metadata'].id = new_doc.id

        // debug('NEW DOC', new_doc)

        sanitize_filter(
          new_doc,
          opts,
          pipeline.output.bind(pipeline),
          pipeline
        )

        process.exit(1)
        // console.log(`trained in ${ obj.iterations } iterations with error: ${ obj.error }`);
        //
        // const result01 = net.run([0, 1]);
        // const result00 = net.run([0, 0]);
        // const result11 = net.run([1, 1]);
        // const result10 = net.run([1, 0]);
        //
        // assert(result01[0] > 0.9);
        // assert(result00[0] < 0.1);
        // assert(result11[0] < 0.1);
        // assert(result10[0] > 0.9);
        //
        // console.log('0 XOR 1: ', result01);  // 0.987
        // console.log('0 XOR 0: ', result00);  // 0.058
        // console.log('1 XOR 1: ', result11);  // 0.087
        // console.log('1 XOR 0: ', result10);  // 0.934
      }
    })

    let sorted_buffer = {}

    if(buffer && buffer.length > 0){
      Array.each(buffer, function(doc){

        if(doc && doc.id === 'changes' && doc.metadata && doc.metadata.from === table && doc.data){
          Array.each(doc.data, function(real_data){
            // let timestamp = real_data.metadata.timestamp
            let host = real_data.metadata.host
            let path = real_data.metadata.path
            // let tags = real_data.metadata.tag
            if(!sorted_buffer[host]) sorted_buffer[host] = {}
            if(!sorted_buffer[host][path]) sorted_buffer[host][path] = []

            sorted_buffer[host][path].push(real_data)
          })
        }

      })
    }

    // debug('process filter %o', sorted_buffer)
    // process.exit(1)


    Object.each(sorted_buffer, function(host_data, host){
      let values = {};
      if(__white_black_lists_filter(hosts_whitelist, hosts_blacklist, host)){

        new_doc.metadata.host = host

        Object.each(host_data, function(real_data, path){

          let first, last
          let tag = []
          let metadata = {}
          let hooks = {}



          // if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){
          // debug('real_data %s %o', path, real_data)
          // process.exit(1)

          first = real_data[0].metadata.timestamp;

          last = real_data[real_data.length - 1].metadata.timestamp;
          // Array.each(real_data, function(doc_data, d_index){
          //
          //   debug('DOC DATA', doc_data)
          //   process.exit(1)
          //
          //   last = doc_data[0].metadata.timestamp;
          //
          //   first = doc_data[doc_data.length - 1].metadata.timestamp;

            // Array.each(doc_data, function(group, group_index){
            Array.each(real_data, function(group, group_index){
              debug('GROUP', group)
              // process.exit(1)

              let path = group.metadata.path


              debug_internals('PATH', path, hooks_path)
              // process.exit(1)

              if(__white_black_lists_filter(paths_whitelist, paths_blacklist, path)){

                // let data = real_data
                let timestamp = group.metadata.timestamp;
                let host = group.metadata.host
                tag.combine(group.metadata.tag)
                metadata = Object.merge(metadata, group.metadata)

                if(!values[host]) values[host] = {};
                if(!values[host][path]) values[host][path] = {};

                let _require = traverse_path_require(type, hooks_path, path)
                // try{
                //   //debug_internals('HOOK path %s', path)
                //   let _require = require('../hooks/'+type+'/'+path)
                if(_require)
                  hooks[path] = _require
                // }
                // catch(e){
                //   debug_internals('no hook file for %s %o', path, e)
                // }
                // if(path === 'os.cpus'){
                //   debug_internals('HOOKs', path, _require)
                //   process.exit(1)
                // }


                Object.each(group.data, function(value, key){//item real data

                  let _key = key
                  debug('KEY', key)


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
                    if(type === 'minute' || !value['mean']){
                      values[host][path][key][timestamp] = value;
                    }
                    else{
                      /**
                      * from historical
                      * */
                      values[host][path][key][timestamp] = value['mean']
                    }




                  }


                });

                // if(d_index == doc.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                //   values[host][path] = hooks[path].post_values(values[host][path])
                // }
                if(group_index == real_data.length -1 && hooks[path] && typeof hooks[path].post_values == 'function'){
                  values[host][path] = hooks[path].post_values(values[host][path])

                  // if(/^os\.blockdevices/.test(path)){
                  //   debug_internals('os.blockdevices ', values[host][path])
                  //   process.exit(1)
                  // }
                }


              }//__white_black_lists_filter




            })

        })

      }

      let docs = {}
      Object.each(values, function(val, host){
        Object.each(val, function(stats, path){
          Object.each(stats, function(rows, key){
            Object.each(rows, function(data, ts){
              if (!docs[ts]) docs[ts] = { idle: undefined, written: undefined, sectors: undefined, queue: undefined }
                if(path === 'os.cpus' && key === 'idle'){
                  docs[ts].idle = data
                }
                else if(path === 'os.rethinkdb.server.read_docs' && key === 'per_sec'){
                  docs[ts].read = data
                }
                else if(path === 'os.rethinkdb.server.written_docs' && key === 'per_sec'){
                  docs[ts].written = data
                }
                else if(path === 'os.blockdevices.vda3.sectors' && key === 'write_sectors'){
                  docs[ts].sectors = data
                }
                else if(path === 'os.blockdevices.vda3.time' && key === 'time_in_queue'){
                  docs[ts].queue = data
                }
            })
          })
        })
      })

      let arr_docs = []
      let tss = Object.keys(docs)
      tss.sort(function (a, b) { return (a > b) ? 1 : ((b > a) ? -1 : 0) }) // sort by timestamp

      new_doc.metadata.range.start = tss[0] * 1
      new_doc.metadata.range.end = tss[tss.length - 1] * 1

      new_doc.metadata.inputs = ['os.rethinkdb.server.read_docs.per_sec', 'os.rethinkdb.server.written_docs.per_sec']
      new_doc.metadata.outputs = ['os.blockdevices.vda3.sectors.write_sectors','os.blockdevices.vda3.time.time_in_queue','os.cpus.idle']

      Array.each(tss, function (ts) {
        ts *= 1
        // arr_docs.push([ts, docs[ts].per_sec, docs[ts].idle])
        arr_docs.push([docs[ts].read, docs[ts].written, docs[ts].sectors, docs[ts].queue, docs[ts].idle])
      })

      debug('arr_docs', arr_docs)

      // arr_docs = arr_docs.filter(doc => (doc[0] !== undefined && doc[1] !== undefined && doc[2] !== undefined && doc[3] !== undefined))
      final_docs = final_docs.combine(arr_docs.filter(doc => (doc[0] !== undefined && doc[1] !== undefined && doc[2] !== undefined && doc[3] !== undefined && doc[4] !== undefined)))

      // debug('final_docs first', final_docs)
      //
      // const LENGTH = 2
      //
      // let current_row = [[], [], [], [], []]
      // for (let i = 0; i < arr_docs.length; i++) {
      //   let row = arr_docs[i]
      //   // debug('CALLBACK ROW %o', current_row, i, i % LENGTH)
      //   if (i === 0 || (i % LENGTH !== 0)) {
      //     current_row[0].push(row[0])
      //     current_row[1].push(row[1])
      //     current_row[2].push(row[2])
      //     current_row[3].push(row[3])
      //     current_row[4].push(row[4])
      //   } else {
      //     current_row[0] = ss.median(current_row[0])
      //     current_row[1] = ss.median(current_row[1])
      //     current_row[2] = ss.median(current_row[2])
      //     current_row[3] = ss.median(current_row[3])
      //     current_row[4] = ss.median(current_row[4])
      //
      //     final_docs.push(Array.clone(current_row))
      //
      //     current_row = [[], [], [], [], []]
      //     current_row[0].push(row[0])
      //     current_row[1].push(row[1])
      //     current_row[2].push(row[2])
      //     current_row[3].push(row[3])
      //     current_row[4].push(row[4])
      //   }
      // }
      //
      // debug('final_docs', final_docs)

      if(final_docs.length >= 300){
        final_docs = shuffle(final_docs)

        read = min_max(final_docs, 0)
        written = min_max(final_docs, 1)
        sectors = min_max(final_docs, 2)
        queue = min_max(final_docs, 3)
        idle = min_max(final_docs, 4)

        debug('read %o - written %o - sectors %o - queue %o - idle %o', read, written, sectors, queue, idle)


        const SPLIT = final_docs.length * 0.8 // 80%
        const train = final_docs.slice(0, SPLIT)
        const test = final_docs.slice(SPLIT + 1)

        final_docs = []

        trainData = train.map(d => {
          return {
            input: [
              normalize(d[0], read.min, read.max),
              normalize(d[1], written.min, written.max)
            ],
            output: [
              normalize(d[2], sectors.min, sectors.max),
              normalize(d[3], queue.min, queue.max),
              normalize(d[4], idle.min, idle.max)
            ]
          }

        })

        testData = test.map(d => {
          return {
            input: [
              normalize(d[0], read.min, read.max),
              normalize(d[1], written.min, written.max)
            ],
            output: [
              normalize(d[2], sectors.min, sectors.max),
              normalize(d[3], queue.min, queue.max),
              normalize(d[4], idle.min, idle.max)
            ]
          }
        })


        debug('trainData %o - testData %o', trainData, testData)
        // process.exit(1)

        if(trainData.length > 0)
          readInputs(trainingStream, trainData);

        // if(values.elk && trainData.length > 0){
        //   debug_internals('values %o', Object.keys(values.elk), trainData)
        //
        //
        // }
      }


    })



  }

  return filter
}
