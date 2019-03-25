'use strict'


let App = require('node-app-rethinkdb-client')

var debug = require('debug')('Server:Apps:UI:Input');
var debug_internals = require('debug')('Server:Apps:UI:Input:Internals');
var debug_events = require('debug')('Server:Apps:UI:Input:Events');

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

module.exports = new Class({
  Extends: App,

  // hosts: [],

  // blacklist_path: undefined,
  // paths: [],

  periodicals: {},

  feed: undefined,
  close_feed: false,
  changes_buffer: [],
  changes_buffer_expire: undefined,


  options: {

		id: 'ui',

		requests : {
			periodical: [

        // {
				// 	get_changes: function(req, next, app){
				// 		//debug_internals('_get_last_stat %o', next);
        //     /**
        //     * 1001ms time lapse (previous second from "now")
        //     **/
        //     let start = Date.now() - 2000
        //     let end = Date.now() - 999
        //
				// 		debug_internals('get_changes %s', new Date(), new Date(start));
        //
				// 		// let views = [];
				// 		// Object.each(app.hosts, function(value, host){
				// 			// debug_internals('_get_last_stat %s', host);
        //
        //       // Array.each(app.paths, function(path){
        //         // debug_internals('_get_last_stat %s %s', host, path);
        //         // let _func = function(){
        //
        //           app.between({
        //             // _extras: {'get_changes': true, host: host, path: path},
        //             uri: app.options.db+'/periodical',
        //             args: [
        //               start,
        //               end,
        //               {
        //                 index: 'timestamp',
        //                 leftBound: 'open',
        //                 rightBound: 'open'
        //               }
        //             ],
        //             // chain: [{orderBy: { index: app.r.desc('sort_by_path') }}, {limit: 1}]
        //             // orderBy: { index: app.r.desc('sort_by_path') }
        //           })
        //
        //         // }.bind(app)
        //
        //
  			// 				// views.push(_func);
        //
        //       // })
        //
				// 		// });
        //
				// 		// Array.each(views, function(view){
				// 		// 	view();
				// 		// });
				// 		// next(views);
				// 	}
				// },
      //   {
			// 		fetch_history: function(req, next, app){
			// 			let now = new Date();
			// 			debug_internals('fetch_history time %s', now);
      //
			// 			let limit = 60;//60 docs = 1 minute of historical data
      //
			// 			let views = [];
      //
			// 			Object.each(app.hosts, function(data, host){
      //
      //         Object.each(data, function(value, path){
      //           debug_internals('fetch_history value %s %d %s', path, value, host);
      //
      //           if(value >= 0){
      //
      //               app.between({
      //                 _extras: {'fetch_history': true, host: host, path: path, from: value},
      //                 uri: app.options.db+'/periodical',
      //                 args: [
      //                   [path, host, 'periodical', value],
      //                   [path, host, 'periodical', roundMilliseconds(Date.now())],
      //                   {
      //                     index: 'sort_by_path',
      //                     leftBound: 'open',
      //                     rightBound: 'open'
      //                   }
      //                 ],
      //                 chain: [{limit: limit}]
      //               })
      //
      //           }//if value
      //         }.bind(app))
      //
      //
			// 			}.bind(app));
      //
      //
			// 		}
      //
			// 	},
      //
      //
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
  __changes: function(){
    debug_internals('__changes')

    if(!this.feed){

      let _close = function(){
        debug_internals('closing cursor onSuspend')
        if(this.feed){
          this.feed.close(function (err) {
            this.close_feed = true

            if (err){
              debug_internals('err closing cursor onSuspend', err)
            }
          }.bind(this))

          this.feed = undefined
        }

        this.removeEvent('onSuspend', _close)
      }.bind(this)

      this.addEvent('onSuspend', _close)


      if(!this.changes_buffer_expire)
        this.changes_buffer_expire = Date.now()

      this.r.db(this.options.db).
      table('periodical').
      // between(Date.now() - 1000, '\ufff0', {index: 'timestamp'}).
      // changes({includeTypes: true, squash: 1, changefeedQueueSize:100}).
      changes({includeTypes: true, squash: 1}).
      run(this.conn, {maxBatchSeconds: 1}, function(err, cursor) {
        // {maxBatchSeconds: 1}

        this.feed = cursor

        this.feed.each(function(err, row){

          /**
          * https://www.rethinkdb.com/api/javascript/each/
          * Iteration can be stopped prematurely by returning false from the callback.
          */
          if(this.close_feed === true){ this.close_feed = false; return false }

          // debug_internals('changes %s', new Date())
          if(row && row !== null ){
            if(row.type == 'add'){
              // debug_internals('changes add %s %o', new Date(), row.new_val)
              debug_internals("changes add now: %s \n timstamp: %s \n expire: %s \n host: %s \n path: %s",
                new Date(roundMilliseconds(Date.now())),
                new Date(roundMilliseconds(row.new_val.metadata.timestamp)),
                new Date(roundMilliseconds(this.changes_buffer_expire)),
                row.new_val.metadata.host,
                row.new_val.metadata.path
              )
              // this.fireEvent('onPeriodicalDoc', [row.new_val, {type: 'periodical', input_type: this, app: null}]);
              this.changes_buffer.push(row.new_val)
            }

            if(this.changes_buffer_expire < Date.now() - 900 && this.changes_buffer.length > 0){
              // console.log('onPeriodicalDoc', this.changes_buffer.length)
              // this.fireEvent('onPeriodicalDoc', [Array.clone(this.changes_buffer), {type: 'periodical', input_type: this, app: null}])

              this.__process_changes(this.changes_buffer)


              // debug_internals('changes %s', new Date(), data)

              this.changes_buffer_expire = Date.now()
              this.changes_buffer = []
            }

          }


        }.bind(this))

      }.bind(this))

    }
    else{
      throw new Error('feed already exist')
    }
  },
  // reduce: function(err, resp, params){
  //   debug_internals('reduce', params.options)
  //
  //   if(err){
  //     debug_internals('reduce err', err)
  //
	// 		if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGetError', err);
	// 		}
  //
	// 		this.fireEvent(this.ON_DOC_ERROR, err);
  //
	// 		this.fireEvent(
	// 			this[
	// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
	// 			],
	// 			err
	// 		);
  //   }
  //   else{
  //
  //     let arr = (resp) ? Object.keys(resp) : []
  //
  //     // resp.toArray(function(err, arr){
  //       // debug_internals('reduce count', arr)
  //
  //
  //     if(params.options._extras == 'paths'){
  //       if(arr.length == 0){
	// 				debug_internals('No paths yet');
	// 			}
	// 			else{
  //
  //         this.paths = []
  //
	// 				Array.each(arr, function(row, index){
	// 					// debug_internals('Path %s', row);
  //
  //           if(
  //             (
  //               !this.blacklist_path
  //               || (this.blacklist_path && this.blacklist_path.test(row) == false)
  //             )
  //             && !this.paths.contains(row)
  //           )
  //             this.paths.push(row)
  //
	// 				}.bind(this));
  //
	// 				debug_internals('PATHs %o', this.paths);
	// 			}
	// 		}
  //     else if(params.options._extras == 'hosts'){
  //       if(arr.length == 0){
	// 				debug_internals('No hosts yet');
	// 			}
	// 			else{
  //
	// 				Array.each(arr, function(row, index){
	// 					let host = row
  //           if(this.hosts[host] == undefined) this.hosts[host] = {}
  //
	// 				}.bind(this));
  //
	// 				debug_internals('HOSTs %o', this.hosts);
	// 			}
  //     }
  //
  //     // }.bind(this))
  //
  //
  //   }
  // },
  // between: function(err, resp, params){
  //   debug_internals('between', params.options)
  //
  //   if(err){
  //     debug_internals('between err', err)
  //
	// 		if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGetError', err);
	// 		}
  //
	// 		this.fireEvent(this.ON_DOC_ERROR, err);
  //
	// 		this.fireEvent(
	// 			this[
	// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
	// 			],
	// 			err
	// 		);
  //   }
  //   else{
  //
  //     resp.toArray(function(err, arr){
  //       debug_internals('between count', arr.length)
  //
  //
  //       if(params.options._extras.get_last_stat == true){
  //         debug_internals('between params.options._extras.get_last_stat %o', arr)
  //         if(arr.length == 0){//there are no historical for this host yet
  //           let host = params.options._extras.host
  //           let path = params.options._extras.path.replace('ui.', '');
  //
  //           if(!this.hosts[host]) this.hosts[host] = {}
  //
  //           this.hosts[host][path] = 0;
  //
  // 					debug_internals('No ui for host %o', host);
  // 					debug_internals('HOSTs %o', this.hosts);
  //
  //         }
  //         else{//if there are historical already, add perdiocal starting from "end"
  // 					//throw new Error('there are historical already:implement');
  //           let host = params.options._extras.host
  //           let path = params.options._extras.path.replace('ui.', '');
  //
  //           // let last = resp[0].doc.metadata.range.end + 1;
  //           let last = arr[0].metadata['timestamp'] + 1
  //
  //           if(!this.hosts[host]) this.hosts[host] = {}
  //
  // 					this.hosts[host][path] = last;
  //
  //           debug_internals('Hosts %o', this.hosts);
  //
  // 				}
  //       }
  //       else if(params.options._extras.fetch_history == true){
  //         // if(params.options._extras.path == 'os.procs.cmd.stats')
  //           debug_internals('between params.options._extras.fetch_history %d %s %d', params.options._extras.from, params.options._extras.path, arr.length)
  //
  //         this.hosts = {};
  //
  // 				if(params.uri != ''){
  // 					this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1), JSON.decode(resp));//capitalize first letter
  // 				}
  // 				else{
  // 					this.fireEvent('onGet', [arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);
  // 				}
  //
  //
  //
  //         if(arr.length > 0){
  //
  //           debug_internals('this.options.requests.current.type %s', this.options.requests.current.type)
  //
  // 					this.fireEvent(
  // 						this[
  // 							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
  // 						],
  // 						[arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
  // 					);
  //
  //
  // 				}
  // 				else{//no docs
  //
  // 				}
  //
  //       }
  //
  //
  //
  //     }.bind(this))
  //
  //
  //   }
  //
  //
  //
  //
  // },


  initialize: function(options){

    this.addEvent('onConnect', this.__changes.bind(this))

		this.parent(options);//override default options

		this.log('ui', 'info', 'ui started');

  },

});
