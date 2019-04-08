'use strict'


let App = require('node-app-rethinkdb-client')

var debug = require('debug')('Server:Apps:UI:Input:RethinkDB');
var debug_internals = require('debug')('Server:Apps:UI:Input:RethinkDB:Internals');
var debug_events = require('debug')('Server:Apps:UI:Input:RethinkDB:Events');

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

const EXPIRE_ID = 5 * SECOND

let get_changes = function(req, next, app){
  if(app.options.on_demand){

    debug_internals('get_ %s', new Date(), req.opt);

    let hosts = undefined
    let paths = undefined
    let range = (req && req.opt && req.opt.range) ? req.opt.range : {start: Date.now() - 1999, end: Date.now()}

    if(req && req.query.hosts){
      try{
        hosts = JSON.parse(req.query.hosts)
      }
      catch(e){
        hosts = [req.query.hosts]
      }
    }
    else if(app.registered){
      hosts = []
      Object.each(app.registered, function(_hosts, id){
        hosts = hosts.combine(_hosts)
      })
    }

    // if(req && req.query.paths){
    //   try{
    //     paths = JSON.parse(req.query.paths)
    //   }
    //   catch(e){
    //     paths = [req.query.paths]
    //   }
    // }

    let views = []
    // if((!hosts || hosts.length == 0) && (!paths || paths.length == 0)){
    if(!hosts || hosts.length == 0){
      let cb = app.between({
        // _extras: {'get_changes': true, host: host, path: path},
        uri: app.options.db+'/periodical',
        args: [
          range.start,
          range.end,
          {
            index: 'timestamp',
            leftBound: 'open',
            rightBound: 'open'
          }
        ],

      })

      views.push(cb)
    }
    else if(hosts && hosts.length > 0){
      debug_internals('get_range hosts %o', hosts)

      Array.each(hosts, function(host){
        let cb = undefined

        if(paths && paths.length > 0){
          debug_internals('get_range paths %o', paths)

          Array.each(paths, function(path){
            cb = app.between({
              // _extras: {'get_changes': true, host: host, path: path},
              uri: app.options.db+'/periodical',
              args: [
                [path, host, 'periodical', range.start],
                [path, host, 'periodical', range.end],
                {
                  index: 'sort_by_path',
                  leftBound: 'open',
                  rightBound: 'open'
                }
              ],

            })

            views.push(cb)
          })
        }
        else{
          cb = app.between({
            // _extras: {'get_changes': true, host: host, path: path},
            uri: app.options.db+'/periodical',
            args: [
              [host, 'periodical', range.start],
              [host, 'periodical', range.end],
              {
                index: 'sort_by_host',
                leftBound: 'open',
                rightBound: 'open'
              }
            ],

          })
          views.push(cb)
        }



      })
    }

    views = views.clean()
    Array.each(views, function(view){
      view()
    })

  }
}

module.exports = new Class({
  Extends: App,

  // hosts: [],

  // blacklist_path: undefined,
  // paths: [],

  periodicals: {},

  feeds: {},
  close_feeds: {},
  changes_buffer: {},
  changes_buffer_expire: {},

  registered: {},

  alive: {},

  options: {

		id: 'ui',

		requests : {
      once: [
        {
					register: function(req, next, app){
						// if(req.host && req.type == 'register' && req.prop == 'data' && req.id){

            if(app.options.on_demand
              && req
              && req.query.hosts
              && req.query.type == 'register'
              && req.query.id
            ){
              debug_internals('register', req.query.hosts)
              let id = req.query.id
              let hosts = undefined
              let paths = undefined

              if(req && req.query.hosts){
                try{
                  hosts = JSON.parse(req.query.hosts)
                }
                catch(e){
                  hosts = (!Array.isArray(req.query.hosts)) ? [req.query.hosts] : req.query.hosts
                }
              }

              // if(req && req.query.paths){
              //   try{
              //     paths = JSON.parse(req.query.paths)
              //   }
              //   catch(e){
              //     paths = [req.query.paths]
              //   }
              // }

              Array.each(hosts, function(host){
                if(!app.registered[id]) app.registered[id] = {}
                if(!app.registered[id][host]) app.registered[id][host] = []

                app.__changes(host)

                // app.registered[host] = app.registered[id][host].combine([prop])
              })

              debug_internals('register result', app.registered);


            }

					}
				},
        {
					unregister: function(req, next, app){

						if(app.options.on_demand
              && req
              && req.query.type == 'unregister'
              && req.query.id
            ){//req.query.hosts &&
              debug_internals('unregister', req.query)
              let id = req.query.id
              let hosts = []
              let paths = undefined

              if(req && req.query.hosts){
                try{
                  hosts = JSON.parse(req.query.hosts)
                }
                catch(e){
                  hosts = (!Array.isArray(req.query.hosts)) ? [req.query.hosts] : req.query.hosts
                }
              }

              // throw new Error()

              // let {host, prop, id} = req
              // app.unregister(host, prop, id)

              if(app.registered[id]){
                Array.each(hosts, function(host){
                  // if(host && prop && app.registered[id][host])
                  //   app.registered[id][host] = app.registered[id][host].erase(prop)

                  // if((host && app.registered[id][host].length == 0) || (host && !prop))
                  if(host && app.registered[id][host].length == 0)
                    delete app.registered[id][host]


                  // if(Object.getLength(app.registered[id]) == 0 || !host)
                  if(Object.getLength(app.registered[id]) == 0)
                    delete app.registered[id]



                })

                if(app.registered[id] && hosts.length == 0)
                  delete app.registered[id]
              }



              debug_internals('unregister result', app.registered);


            }

					}
        },
        {
					ping: function(req, next, app){

						if(app.options.on_demand
              && req
              && req.query.type == 'ping'
              && req.query.ids
            ){//req.query.hosts &&
              debug_internals('ping', req.query)


              // let id = req.query.id
              let ids = []
              // let paths = undefined
              //
              if(req && req.query.ids){
                try{
                  ids = JSON.parse(req.query.ids)
                }
                catch(e){
                  ids = (!Array.isArray(req.query.ids)) ? [req.query.ids] : req.query.ids
                }
              }

              Array.each(ids, function(id){
                app.alive[id] = Date.now()
              })


            }

					}
        }
      ],
      range: [
        {
          get_range: get_changes,
        }
      ],
			periodical: [
        {
          check_alive: function(req, next, app){
            if(app.options.on_demand)
              Object.each(app.alive, function(timestamp, id){
                if(timestamp < Date.now() - EXPIRE_ID){
                  delete app.alive[id]
                  delete app.registered[id]
                }
              })
          }
        },
        {
          check_feeds: function(req, next, app){
            if(app.options.on_demand)
              Object.each(app.feeds, function(feed, host){
                let found = false
                Object.each(app.registered, function(hosts, id){
                  if(app.registered[id][host]) found = true

                })
                if(found === false){
                  debug_internals('closing feed for host', host)
                  app.__close_changes(host)
                }

              })

          }
        }
      //   {
      //     get_periodical: get_changes,
      //
			// 		// get_changes: function(req, next, app){
			// 		// 	debug_internals('_get_last_stat %o', next);
      //     //   /**
      //     //   * 1001ms time lapse (previous second from "now")
      //     //   **/
      //     //   let start = Date.now() - 2000
      //     //   let end = Date.now() - 999
      //     //
			// 		// 	debug_internals('get_changes %s', new Date(), new Date(start));
      //     //
      //     //   app.between({
      //     //     // _extras: {'get_changes': true, host: host, path: path},
      //     //     uri: app.options.db+'/periodical',
      //     //     args: [
      //     //       start,
      //     //       end,
      //     //       {
      //     //         index: 'timestamp',
      //     //         leftBound: 'open',
      //     //         rightBound: 'open'
      //     //       }
      //     //     ],
      //     //     // chain: [{orderBy: { index: app.r.desc('sort_by_path') }}, {limit: 1}]
      //     //     // orderBy: { index: app.r.desc('sort_by_path') }
      //     //   })
      //     //
      //     //
			// 		// }
			// 	},
      //
			],


		},

		routes: {
      between: [{
        path: ':database/:table',
        callbacks: ['between']
      }],
      // reduce: [{
      //   path: ':database/:table',
      //   callbacks: ['reduce']
      // }],
		},

  },
  between: function(err, resp, params){
    if(resp)
      resp.toArray(function(err, results) {
        if (err) throw err;

        debug_internals('changes', results.length)

        if(results.length > 0)
          this.__process_changes(results)

      }.bind(this));

  },
  __process_changes: function(buffer){
    debug_internals('__process_changes')

    let data = {}
    Array.each(buffer, function(doc){
      let path = doc.metadata.path
      let host = doc.metadata.host

      if(!data[host]) data[host] = {}
      if(!data[host][path]) data[host][path] = []
      data[host][path].push(doc)

    }.bind(this))

    Object.each(data, function(host_data, host){
      // debug_internals('changes emiting %o', host, host_data)
      let doc = {}
      doc[host] = host_data
      this.fireEvent('onDoc', [doc, Object.merge(
        {input_type: this, app: null},
        // {host: host, type: 'host', prop: prop, id: id}
        // {type: prop, host: host}
      )])


    }.bind(this))
  },
  __close_changes: function(host){
    debug_internals('__close_changes', host)

    if(this.feeds[host]){
      this.feeds[host].close(function (err) {
        this.close_feeds[host] = true

        if (err){
          debug_internals('err closing cursor onSuspend', err)
        }
      }.bind(this))

      delete this.feeds[host]
    }

    // this.removeEvent('onSuspend', this.__close_changes)
  },
  __changes: function(host){
    debug_internals('__changes', host)

    if(!this.feeds[host]){

      // this.addEvent('onSuspend', _close)
      this.addEvent('onSuspend', this.__close_changes.pass(host, this))

      if(!this.changes_buffer[host]) this.changes_buffer[host] = []

      if(!this.changes_buffer_expire[host]) this.changes_buffer_expire[host] = Date.now()

      let _to_run = undefined
      if(this.options.on_demand){
        _to_run = this.r.db(this.options.db).
                  table('periodical').
                  getAll(host, {index: 'host'}).
                  changes({includeTypes: true, squash: 1}).filter(this.r.row('old_val').eq(null))('new_val')
      }
      else{
        _to_run = this.r.db(this.options.db).
                  table('periodical').
                  changes({includeTypes: true, squash: 1}).filter(this.r.row('old_val').eq(null))('new_val')
      }

      _to_run.run(this.conn, {maxBatchSeconds: 1}, function(err, cursor) {
        debug_internals('__cursor %s', new Date())

        this.feeds[host] = cursor

        // let expire = Date.now() - 1000
        this.feeds[host].each(function(err, row){

          debug_internals('each %s', new Date())

          /**
          * https://www.rethinkdb.com/api/javascript/each/
          * Iteration can be stopped prematurely by returning false from the callback.
          */
          if(this.close_feeds[host] === true){ this.close_feeds[host] = false; delete this.feeds[host]; return false }

          // debug_internals('changes %s', new Date(), row)
          // process.exit(1)
          if(row && row !== null ){
            // if(row.type == 'add'){
            //   // debug_internals('changes add %s %o', new Date(), row.new_val)
            //   // debug_internals("changes add now: %s \n timstamp: %s \n expire: %s \n host: %s \n path: %s",
            //   //   new Date(roundMilliseconds(Date.now())),
            //   //   new Date(roundMilliseconds(row.new_val.metadata.timestamp)),
            //   //   new Date(roundMilliseconds(this.changes_buffer_expire[host])),
            //   //   row.new_val.metadata.host,
            //   //   row.new_val.metadata.path
            //   // )
            //
            //   this.changes_buffer[host].push(row.new_val)
            // }
            this.changes_buffer[host].push(row)

            if(this.changes_buffer_expire[host] < Date.now() - 999 && this.changes_buffer[host].length > 0){
              // console.log('onPeriodicalDoc', this.changes_buffer.length)
              // this.fireEvent('onPeriodicalDoc', [Array.clone(this.changes_buffer), {type: 'periodical', input_type: this, app: null}])

              this.__process_changes(this.changes_buffer[host])


              this.changes_buffer_expire[host] = Date.now()
              this.changes_buffer[host] = []

            }

          }


        }.bind(this))

      }.bind(this))

    }
    else{
      // throw new Error('feed already exist')
      debug_internals('feed already exist')
    }
  },
  // __changes: function(){
  //   debug_internals('__changes')
  //
  //   if(!this.feed){
  //
  //     let _close = function(){
  //       debug_internals('closing cursor onSuspend')
  //       if(this.feed){
  //         this.feed.close(function (err) {
  //           this.close_feed = true
  //
  //           if (err){
  //             debug_internals('err closing cursor onSuspend', err)
  //           }
  //         }.bind(this))
  //
  //         this.feed = undefined
  //       }
  //
  //       this.removeEvent('onSuspend', _close)
  //     }.bind(this)
  //
  //     this.addEvent('onSuspend', _close)
  //
  //
  //     if(!this.changes_buffer_expire)
  //       this.changes_buffer_expire = Date.now()
  //
  //     this.r.db(this.options.db).
  //     table('periodical').
  //     // between(Date.now() - 1000, '\ufff0', {index: 'timestamp'}).
  //     // changes({includeTypes: true, squash: 1, changefeedQueueSize:100}).
  //     changes({includeTypes: true, squash: 1}).
  //     run(this.conn, {maxBatchSeconds: 1}, function(err, cursor) {
  //       // {maxBatchSeconds: 1}
  //
  //       this.feed = cursor
  //
  //       this.feed.each(function(err, row){
  //
  //         /**
  //         * https://www.rethinkdb.com/api/javascript/each/
  //         * Iteration can be stopped prematurely by returning false from the callback.
  //         */
  //         if(this.close_feed === true){ this.close_feed = false; return false }
  //
  //         // debug_internals('changes %s', new Date())
  //         if(row && row !== null ){
  //           if(row.type == 'add'){
  //             // debug_internals('changes add %s %o', new Date(), row.new_val)
  //             debug_internals("changes add now: %s \n timstamp: %s \n expire: %s \n host: %s \n path: %s",
  //               new Date(roundMilliseconds(Date.now())),
  //               new Date(roundMilliseconds(row.new_val.metadata.timestamp)),
  //               new Date(roundMilliseconds(this.changes_buffer_expire)),
  //               row.new_val.metadata.host,
  //               row.new_val.metadata.path
  //             )
  //             // this.fireEvent('onPeriodicalDoc', [row.new_val, {type: 'periodical', input_type: this, app: null}]);
  //             this.changes_buffer.push(row.new_val)
  //           }
  //
  //           if(this.changes_buffer_expire < Date.now() - 900 && this.changes_buffer.length > 0){
  //             // console.log('onPeriodicalDoc', this.changes_buffer.length)
  //             // this.fireEvent('onPeriodicalDoc', [Array.clone(this.changes_buffer), {type: 'periodical', input_type: this, app: null}])
  //
  //             this.__process_changes(this.changes_buffer)
  //
  //
  //             // debug_internals('changes %s', new Date(), data)
  //
  //             this.changes_buffer_expire = Date.now()
  //             this.changes_buffer = []
  //           }
  //
  //         }
  //
  //
  //       }.bind(this))
  //
  //     }.bind(this))
  //
  //   }
  //   else{
  //     throw new Error('feed already exist')
  //   }
  // },


  initialize: function(options){

    // this.addEvent('onConnect', this.__changes.bind(this))
    // this.addEvent('onResume', this.__changes.bind(this))

    if(options.on_demand){
      this.addEvent('onSuspend', function(){
        debug_internals('onSuspend')
        if(Object.getLength(this.registered) > 0){
          debug_internals('resuming...', this.registered)
          this.fireEvent('onResume', undefined, 1000)
        }

      }.bind(this))
    }
    else{
      this.addEvent('onConnect', this.__changes.pass('_', this))
    }

		this.parent(options);//override default options

		this.log('ui', 'info', 'ui started');

  },

});
