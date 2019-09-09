'use strict'

// const App = require ( 'node-app-rethinkdb-client/index' )
const App = require('node-app')

let redis = require('redis')


let debug = require('debug')('Server:Apps:Purge:Input:Redis'),
    debug_events = require('debug')('Server:Apps:Purge:Input:Redis:Events'),
    debug_internals = require('debug')('Server:Apps:Purge:Input:Redis:Internals');


const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  // console.log('roundMilliseconds', d.getTime())
  return d.getTime()
}


const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24


// const EXPIRE_SECONDS = 60 * 60 //one hour
// const HISTORICAL_MINUTE_EXPIRE_SECONDS = {
//   "minute": 60 * 60 * 24, //24hs
//   "hour": 60 * 60 * 24 * 7 //one week
// }

/**
* prod
**/
const DEFAULT_EXPIRE_SECONDS = (60 * SECOND) * 60 //one hour

/**
* test
**/
// const DEFAULT_EXPIRE_SECONDS = (60 * SECOND) * 5 //5 min
// const HISTORICAL_EXPIRE_SECONDS = {
//   "minute": 60 * 60, //1 hour
//   "hour": 60 * 60 * 24//24 hours
// }


const DEFAULT_TYPE = "periodical"
const HISTORICAL_TYPES = ["minute", "hour"]

module.exports = new Class({
  Extends: App,

  ON_CONNECT: 'onConnect',
  ON_CONNECT_ERROR: 'onConnectError',


  // FOLD_BASE: 300,
  MAX_RANGE_DATA_POINTS: 300,

  feeds: undefined,
  close_feed: undefined,
  changes_buffer: {},
  changes_buffer_expire: {},

  // changes_buffer: [],
  // changes_buffer_expire: undefined,

  events: {},
  // feed: undefined,
  // close_feed: false,

  registered: {},
  hosts_ranges: {},

  scan_cursor: {},
  scan_hosts: {},

  options: {
    host: '127.0.0.1',
    port: undefined,
    db: undefined,
    // table: undefined,
    redis: {},

    scan_count: 1000,
    scan_host_expire: SECOND * 10,

		requests : {
      periodical: [
        // {
        //   scan: function(req, next, app){
        //     app.__scan(undefined, undefined, app)
        //   //   // Object.each(app.scan_hosts, function(data, host){
        //   //   //   if(data.timestamp + app.options.scan_host_expire < Date.now())
        //   //   //     delete app.scan_hosts[host]
        //   //   // })
        //   //   //
        //   //   // if(app.data_hosts && app.data_hosts.length > 0){
        //   //   //   Array.each(app.data_hosts, function(host){
        //   //   //     if(!app.scan_cursor[host]) app.scan_cursor[host] = 0
        //   //   //
        //   //   //     app.conn.scan(app.scan_cursor[host], 'MATCH', host+"\.*", 'COUNT', app.options.scan_count, function(err, result) {
        //   //   //       // debug_internals('scan', err, result)
        //   //   //       if(!err){
        //   //   //         if(!app.scan_hosts[host]) app.scan_hosts[host] = {keys: [], timestamp: Date.now()}
        //   //   //
        //   //   //         app.scan_hosts[host].keys.combine(result[1])
        //   //   //
        //   //   //         app.scan_cursor[host] = result[0]
        //   //   //       }
        //   //   //       // this.fireEvent(this.ON_DOC_SAVED, [err, result])
        //   //   //     }.bind(this))
        //   //   //
        //   //   //
        //   //   //   })
        //   //   // }
        //   }
        // },
        {
					get_data_range: function(req, next, app){
            debug_internals('get_data_range', app.data_hosts);
						if(app.data_hosts && app.data_hosts.length > 0){

              Array.each(app.data_hosts, function(host){

                app.__scan(host, function(){
                  let timestamps = app.__get_timestamps(app.scan_hosts[host].keys)
                  debug_internals('get_data_range', host, timestamps)

                  if(timestamps.length > 0){
                    app.data_range(
                      undefined,
                      { metadata: { timestamp: timestamps[0] }},
                      {
                        options:{
                          _extras: {
                            id: undefined,
                            prop: 'data_range',
                            range_select : 'start',
                            host: host,
                            type: 'prop'
                          }
                        }
                      }
                    )

                    app.data_range(
                      undefined,
                      { metadata: { timestamp: timestamps[timestamps.length - 1] }},
                      {
                        options: {
                          _extras: {
                            id: undefined,
                            prop: 'data_range',
                            range_select : 'end',
                            host: host,
                            type: 'prop'
                          }
                        }
                      }
                    )
                  }
                }, app)




              })

            }

					}
				},
        {
					search_paths: function(req, next, app){
            debug('search_paths', app.data_hosts)
						// if(req.host && !req.type && (req.prop == 'paths' || !req.prop)){
            if(app.data_hosts && app.data_hosts.length > 0){

              Array.each(app.data_hosts, function(host){

                app.__scan(host, function(){
                  let paths = app.__get_paths(app.scan_hosts[host].keys, host)
                  debug_internals('search_paths', host, paths);

                  if(Object.getLength(paths) > 0)
                    app.paths(
                      undefined,
                      paths,
                      {
                        options: {
                          _extras: {id: undefined, prop: 'paths', host: host, type: 'prop'},
                        }
                      }
                    )

                }, app)




              })
            }

					}
				},
        // {
				// 	get_changes: function(req, next, app){
        //     if(app.registered){
        //       let hosts = []
        //       Object.each(app.registered, function(registered_data, id){
        //         // debug_internals('get_changes', registered_data)
        //         Object.each(registered_data, function(props, host){
        //
        //           if(props.contains('data'))//if registered for "data"
        //             hosts = hosts.combine([host])
        //
        //         })
        //       })
  			// 			//debug_internals('_get_last_stat %o', next);
        //       // let start = Date.now() - 3999
        //       // let end = Date.now()
        //
  			// 			debug_internals('get_changes %s', new Date(), app.hosts_ranges, hosts);
        //
  			// 			// let views = [];
  			// 			// Object.each(app.hosts, function(value, host){
  			// 				// debug_internals('_get_last_stat %s', host);
        //
        //         Array.each(hosts, function(host){
        //           // debug_internals('_get_last_stat %s %s', host, path);
        //           // let _func = function(){
        //
        //           // app.__scan(host, function(){
        //           if(app.hosts_ranges[host] && app.hosts_ranges[host].end){
        //             let paths = app.__get_paths(app.scan_hosts[host].keys, host)
        //
        //             app.__get_data(
        //               host,
        //               paths,
        //               roundMilliseconds(app.hosts_ranges[host].end) - SECOND * 2,
        //               roundMilliseconds(app.hosts_ranges[host].end),
        //               function(err, data){
        //                 app.data(
        //                   err,
        //                   data,
        //                   {
        //                     options: {
        //                       _extras: {
        //                         id: undefined,
        //                         prop: 'changes',
        //                         host: host,
        //                       },
        //                     }
        //                   }
        //                 )
        //               }
        //             )
        //
        //           }
        //           // }, app)
        //
        //
        //
        //         }.bind(app))
        //
        //     }
				// 	}
				// },


      ],


		},

		routes: {
      reduce: [{
        path: ':database/:table',
        callbacks: ['paths']
      }],
      // map: [{
      //   path: ':database/:table',
      //   callbacks: ['data']
      // }],
      between: [{
        path: ':database/:table',
        callbacks: ['data']
      }],
      // nth: [{
      //   path: ':database/:table',
      //   callbacks: ['data_range']
      // }],
      // distinct: [{
      //   path: ':database/:table',
      //   callbacks: ['distinct']
      // }],
      // changes: [{
      //   path: ':database/:table',
      //   callbacks: ['changes']
      // }],

		},


  },

  properties: ['paths', 'data', 'data_range'],
  // properties: [],

  hosts: {},
  _multi_response: {},

  connect: function(err, conn, params){
		debug_events('connect %o', err, conn)
		if(err){
			this.fireEvent(this.ON_CONNECT_ERROR, { error: err, params: params });
			// throw err
		}
		else if(conn){
			// this.conn = conn
			this.fireEvent(this.ON_CONNECT, { conn: conn,  params: params});

      // let index = params.index
      // this.options.conn[index].accept = true

		}
	},
  initialize: function(options, connect_cb){


    // this.fireEvent(this.ON_CLIENT_CONNECT, undefined, 2000)

    this.addEvent('onSuspend', function(){
      this.registered = {}
    }.bind(this))


    this.setOptions(options);//override default options

    let opts = Object.merge(
      this.options.redis,
      {
        host: this.options.host,
        port: this.options.port,
        db: this.options.db
      }
    )

    let _cb = function(err, conn){
      this.conn = conn
      connect_cb = (typeOf(connect_cb) ==  "function") ? connect_cb.bind(this) : this.connect.bind(this)
      connect_cb(err, conn, opts)
    }.bind(this)

    let client = redis.createClient(opts)


    client.on('connect', function(){ _cb(undefined, client) }.bind(this))
    client.on('error', function(err){ _cb(err, undefined) }.bind(this))


    // this.addEvent('onResume', this.register_on_changes.bind(this))

		this.profile('Server:Apps:Purge:Input:Redis_init');//start profiling


		this.profile('Server:Apps:Purge:Input:Redis_init');//end profiling

		this.log('Server:Apps:Purge:Input:Redis', 'info', 'Server:Apps:Purge:Input:Redis started');

    debug_internals('initialize', this.options)

  },
  __scan: function(hosts, cb, self){
    hosts = hosts || self.data_hosts
    if(!Array.isArray(hosts)) hosts = [hosts]

    debug_internals('__scan', hosts, self.scan_hosts, self.scan_cursor)

    Object.each(self.scan_hosts, function(data, host){
      if(data.timestamp + self.options.scan_host_expire < Date.now())
        delete self.scan_hosts[host]
    })

    if(hosts && hosts.length > 0){

      Array.each(hosts, function(host){

        if(!self.scan_cursor[host]) self.scan_cursor[host] = 0

        debug_internals('scan', host)

        self.conn.scan(self.scan_cursor[host], 'MATCH', host+"\.*", 'COUNT', self.options.scan_count, function(err, result) {

          // debug_internals('scan result', result)

          if(!err){
            if(!self.scan_hosts[host]) self.scan_hosts[host] = {keys: [], timestamp: Date.now()}

            self.scan_hosts[host].keys.combine(result[1])

            self.scan_cursor[host] = result[0]
          }

          if(cb && typeof cb == 'function')
            cb(err, result)

          // self.fireEvent(self.ON_DOC_SAVED, [err, result])
        }.bind(self))


      }.bind(self))
    }
  },

  __get_paths: function(keys, host, start, end){

    let paths = {}
    Array.each(keys, function(key){
      let ts = key.substring(key.indexOf('@') + 1) * 1
      let path = key.substring(0, key.indexOf('@'))
      path = path.replace(host+'.', '')
      // debug_internals('__get_timestamps ts', ts)

      if((!start || ts >= start) && (!end || ts <= end))
        paths[path] = true
    })
    // paths = paths.filter(function(value, index, self) {
    //   return self.indexOf(value) === index;
    // })


    return paths
  },

  paths: function(err, resp, params){
    debug_internals('paths', err, params.options)

    if(err){
      // debug_internals('reduce err', err)

			if(params.uri != ''){
				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
			}
			else{
				this.fireEvent('onGetError', err);
			}

			this.fireEvent(this.ON_DOC_ERROR, err);

			this.fireEvent(
				this[
					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
				],
				err
			);
    }
    else {
      let extras = params.options._extras
      let host = extras.host
      let prop = extras.prop
      let type = extras.type
      let id = extras.id


      if(!this.hosts[host]) this.hosts[host] = {}

      this.hosts[host]['paths'] = Object.keys(resp)

      //
      // // if(resp) debug_internals('paths', Object.keys(resp))
      //
      // // let result = {}
      // // this.hosts[host][prop] = (resp) ? Object.keys(resp).map(function(item){ return item.replace(/\./g, '_') }) : null
      // this.hosts[host][prop] = (resp) ? Object.keys(resp) : null
      //
      // if(type == 'prop' || (Object.keys(this.hosts[host]).length == this.properties.length)){
      //   let found = false
      //   Object.each(this.hosts[host], function(data, property){//if at least a property has data, host exist
      //     if(data !== null && ((Array.isArray(data) || data.length > 0) || Object.getLength(data) > 0))
      //       found = true
      //   })
      //
      //   // debug_internals('paths firing host...', this.hosts[host])
      //
      //   // debug_internals('paths firing host...', this.hosts[host], Object.merge(
      //   //   extras,
      //   //   {type: 'host'}
      //   //   // {host: host, type: 'host', prop: prop, id: id}
      //   // ))
      //
      //   // if(id === undefined){
      //   //   this.fireEvent('onDoc', [(found) ? this.hosts[host]['paths'] : null, Object.merge(
      //   //     {input_type: this, app: null},
      //   //     extras,
      //   //     // {type: 'host'}
      //   //     {type: (id === undefined) ? 'paths' : 'host'}
      //   //     // {host: host, type: 'host', prop: prop, id: id}
      //   //   )])
      //   // }
      //   // else{
      //     this.fireEvent('onDoc', [(found) ? this.hosts[host] : null, Object.merge(
      //       {input_type: this, app: null},
      //       extras,
      //       // {type: 'host'}
      //       {type: (id === undefined) ? 'paths' : 'host'}
      //       // {host: host, type: 'host', prop: prop, id: id}
      //     )])
      //   // }
      //
      //   delete this.hosts[host]
      // }



    }
  },
  __get_timestamps: function(keys, start, end){
    let timestamps = []
    Array.each(keys, function(key){
      let ts = key.substring(key.indexOf('@') + 1) * 1

      // debug_internals('__get_timestamps ts', ts, start, end, ((!start || ts >= start) && (!end || ts <= end)))

      if((!start || ts >= start) && (!end || ts <= end)){
        timestamps.push(ts)
      }
    })

    timestamps = timestamps.sort(function(a, b){ return a - b})

    return timestamps
  },
  __search_paths: function(keys, host){

    let paths = this.__get_paths(keys, host)
    debug_internals('search_paths', host, paths);

    if(Object.getLength(paths) > 0)
      this.paths(
        undefined,
        paths,
        {
          options: {
            _extras: {id: undefined, prop: 'paths', host: host, type: 'prop'},
          }
        }
      )

	},

  data_range: function(err, resp, params){
    debug_internals('data_range', err, resp, params.options)

    if(err){
      // debug_internals('reduce err', err)

			if(params.uri != ''){
				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
			}
			else{
				this.fireEvent('onGetError', err);
			}

			this.fireEvent(this.ON_DOC_ERROR, err);

			this.fireEvent(
				this[
					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
				],
				err
			);
    }
    else{
      let extras = params.options._extras
      let host = extras.host
      let prop = extras.prop
      let range_select = extras.range_select //start | end
      let type = extras.type
      let id = extras.id

      if(!this.hosts[host]) this.hosts[host] = {}
      if(!this.hosts[host][prop]) this.hosts[host][prop] = {start: '', end: ''}



      // if(extras.range == 'end')
      //   process.exit(1)

      // // if(resp) debug_internals('paths', Object.keys(resp))
      //
      // // let result = {}
      // // this.hosts[host][prop] = (resp) ? Object.keys(resp).map(function(item){ return item.replace(/\./g, '_') }) : null
      this.hosts[host][prop][range_select] = (resp && resp.metadata && resp.metadata.timestamp) ? resp.metadata.timestamp : null

      // debug_internals('data_range', this.hosts)

      if(this.hosts[host].paths && this.hosts[host][prop]['start'] != '' && this.hosts[host][prop]['end'] != ''){
        let now = roundMilliseconds(Date.now() + SECOND)
        let end_purge = now - DEFAULT_EXPIRE_SECONDS

        if(this.hosts[host][prop]['start'] < end_purge){
          let start = this.hosts[host][prop]['start']
          let purge_range = []
          do {
            purge_range.push(start)
            start += SECOND
            // debug_internals('purge ts', start)
          } while (start < end_purge);

          if(this.hosts[host].paths.length > 0 && purge_range.length > 0){
            // debug_internals('purge purge_range', purge_range)
            let purge_keys = []
            // let multi = this.conn.multi()

            Array.each(this.hosts[host].paths, function(path){
              debug_internals('purge path', path)

              Array.each(purge_range, function(ts, index){
                // debug(host+'.'+path+'@'+ts)
                purge_keys.push(host+'.'+path+'@'+ts)
                // multi.del(host+'.'+path+'@'+ts)
                //
                // if(index == purge_range.length -1){
                //   // debug('purging ', purge_keys.length)
                //   multi.exec(function (err, result) {
                //     debug_internals('multi.exec', err, result)
                //     // this.fireEvent(this.ON_DOC_SAVED, [err, result])
                //     // conn.publish(channel, keys.join(','), function (err, result) {
                //     //   debug_internals('publish', err, result)
                //     // })
                //   }.bind(this))
                //   // purge_keys = []
                // }

              }.bind(this))



              // debug_internals('purge purge_keys', purge_keys.length)

            }.bind(this))



            let multi = this.conn.multi()

            Array.each(purge_keys, function(id, index){

              multi.del(id)

              if(index == purge_keys.length -1)
                multi.exec(function (err, result) {
                  debug_internals('multi.exec', err, result)
                  debug_internals('purge key', purge_keys[purge_keys.length - 1])
                  // this.fireEvent(this.ON_DOC_SAVED, [err, result])
                  // conn.publish(channel, keys.join(','), function (err, result) {
                  //   debug_internals('publish', err, result)
                  // })
                }.bind(this))
            }.bind(this))

          }
        }
      }

    //     this.hosts_ranges[host] = Object.clone(this.hosts[host]['data_range'])
    //
    //     debug_internals('data_range firing host...', this.hosts_ranges[host])
    //
    //     if(type == 'prop' || (Object.keys(this.hosts[host]).length == this.properties.length)){
    //       let found = false
    //       Object.each(this.hosts[host], function(data, property){//if at least a property has data, host exist
    //         if(data !== null && ((Array.isArray(data) || data.length > 0) || Object.getLength(data) > 0))
    //           found = true
    //       })
    //
    //
    //
    //
    //       // if(id === undefined){
    //       //   this.fireEvent('onDoc', [(found) ? this.hosts[host]['data_range'] : null, Object.merge(
    //       //     {input_type: this, app: null},
    //       //     extras,
    //       //     {type: (id === undefined) ? 'data_range' : 'host'}
    //       //     // {host: host, type: 'host', prop: prop, id: id}
    //       //   )])
    //       // }
    //       // else{
    //         this.fireEvent('onDoc', [(found) ? this.hosts[host] : null, Object.merge(
    //           {input_type: this, app: null},
    //           extras,
    //           {type: (id === undefined) ? 'data_range' : 'host'}
    //           // {host: host, type: 'host', prop: prop, id: id}
    //         )])
    //       // }
    //
    //       delete this.hosts[host]
    //     }
    //   }
    //
    //
    //
    }
  },

	__get_data_range: function(keys, host){

    let timestamps = this.__get_timestamps(keys)
    debug_internals('get_data_range', host, timestamps)

    if(timestamps.length > 0){
      this.data_range(
        undefined,
        { metadata: { timestamp: timestamps[0] }},
        {
          options:{
            _extras: {
              id: undefined,
              prop: 'data_range',
              range_select : 'start',
              host: host,
              type: 'prop'
            }
          }
        }
      )

      this.data_range(
        undefined,
        { metadata: { timestamp: timestamps[timestamps.length - 1] }},
        {
          options: {
            _extras: {
              id: undefined,
              prop: 'data_range',
              range_select : 'end',
              host: host,
              type: 'prop'
            }
          }
        }
      )
    }
    // }, app)



  },
  // __get_changes: function(keys, host){
  //
	// 	debug_internals('get_changes %s', new Date(), host);
  //
  //   let paths = this.__get_paths(keys, host)
  //   let timestamps = this.__get_timestamps(keys)
  //   let start = timestamps[0]
  //   let end = timestamps[timestamps.length - 1]
  //   this.__get_data(
  //     host,
  //     paths,
  //     start,
  //     end,
  //     function(err, data){
  //       this.data(
  //         err,
  //         data,
  //         {
  //           options: {
  //             _extras: {
  //               id: undefined,
  //               prop: 'changes',
  //               host: host,
  //             },
  //           }
  //         }
  //       )
  //     }.bind(this)
  //   )
  //
	// },
  // __process_changes: function(buffer){
  //   let data = {}
  //   Array.each(buffer, function(doc){
  //     let path = doc.metadata.path
  //     let host = doc.metadata.host
  //
  //     if(!data[host]) data[host] = {}
  //     if(!data[host][path]) data[host][path] = []
  //     data[host][path].push(doc)
  //
  //   }.bind(this))
  //
  //   Object.each(data, function(host_data, host){
  //     // debug_internals('changes emiting %o', host, host_data)
  //     this.fireEvent('onDoc', [{ data : host_data }, Object.merge(
  //       {input_type: this, app: null},
  //       // {host: host, type: 'host', prop: prop, id: id}
  //       {type: 'data', host: host}
  //     )])
  //
  //   }.bind(this))
  // },




});
