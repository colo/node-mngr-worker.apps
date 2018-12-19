'use strict'

// var App = require('node-app-cradle-client');
let App = require('node-app-rethinkdb-client')

var debug = require('debug')('Server:Apps:OS:Historical:Minute:Input');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Input:Internals');
var debug_events = require('debug')('Server:Apps:OS:Historical:Minute:Input:Events');

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  // console.log('roundMilliseconds', d.getTime())
  return d.getTime()
}

// const EXPIRE_SECONDS = 60 * 60 //one hour
// const HISTORICAL_MINUTE_EXPIRE_SECONDS = {
//   "minute": 60 * 60 * 24, //24hs
//   "hour": 60 * 60 * 24 * 7 //one week
// }


/**
* test
**/
const DEFAULT_EXPIRE_SECONDS = 60 * 15 //15 min
const HISTORICAL_EXPIRE_SECONDS = {
  "minute": 60 * 60, //1 hour
  "hour": 60 * 60 * 24//24 hours
}


const DEFAULT_TYPE = "periodical"
const HISTORICAL_TYPES = ["minute", "hour"]

module.exports = new Class({
  Extends: App,

  // hosts: {},
  hosts: [],
  // blacklist_path: /historical/,
  blacklist_path: undefined,
  paths: [],

  periodicals: {},

  options: {

		id: 'os.historical.minute',

		requests : {
			periodical: [
        {
					search_paths: function(req, next, app){
            debug_internals('search_paths');

            app.between({
              _extras: 'path',
              uri: app.options.db+'/periodical',
              args: [
                roundMilliseconds(Date.now() - 1000),
                roundMilliseconds(Date.now()),
                {
                  index: 'timestamp',
                  leftBound: 'open',
                  rightBound: 'open'
                }
              ]
            })


					}
				},
        {
					search_hosts: function(req, next, app){
						debug_internals('search_hosts');

            app.between({
              _extras: 'host',
              uri: app.options.db+'/periodical',
              args: [
                roundMilliseconds(Date.now() - 1000),
                roundMilliseconds(Date.now()),
                {
                  index: 'timestamp',
                  leftBound: 'open',
                  rightBound: 'open'
                }
              ]
            })

					}
				},
        {
					get_last_stat: function(req, next, app){
						//debug_internals('_get_last_stat %o', next);
						debug_internals('_get_last_stat %o', app.hosts);

						let views = [];
						Object.each(app.hosts, function(value, host){
							debug_internals('_get_last_stat %s', host);

              Array.each(app.paths, function(path){
                debug_internals('_get_last_stat %s %s', host, path);
                let _func = function(){
                  app.between({
                    _extras: {'get_last_stat': true, host: host, path: path},
                    uri: app.options.db+'/historical',
                    args: [
                      [path, host, 'minute', roundMilliseconds(0)],
                      [path, host, 'minute', roundMilliseconds(Date.now())],
                      {
                        index: 'sort_by_path',
                        leftBound: 'open',
                        rightBound: 'open'
                      }
                    ],
                    chain: [{orderBy: { index: app.r.desc('sort_by_path') }}, {limit: 1}]
                    // orderBy: { index: app.r.desc('sort_by_path') }
                  })

                }.bind(app)


  							views.push(_func);

              })

						});

						Array.each(views, function(view){
							view();
						});
						// next(views);
					}
				},
        {
					fetch_history: function(req, next, app){
						let now = new Date();
						debug_internals('fetch_history time %s', now);

						let limit = 60;//60 docs = 1 minute of historical data

						let views = [];

						Object.each(app.hosts, function(data, host){

              Object.each(data, function(value, path){
                debug_internals('fetch_history value %s %d %s', path, value, host);

                if(value >= 0){
                  // let _func = function(){
                    app.between({
                      _extras: {'fetch_history': true, host: host, path: path, from: value},
                      uri: app.options.db+'/periodical',
                      args: [
                        [path, host, 'periodical', value],
                        [path, host, 'periodical', roundMilliseconds(Date.now())],
                        {
                          index: 'sort_by_path',
                          leftBound: 'open',
                          rightBound: 'open'
                        }
                      ],
                      chain: [{limit: limit}]
                      // orderBy: { index: app.r.desc('sort_by_path') }
                    })

                  // }.bind(app)

  								// let cb = next.pass(
  								// 	app.view({
  								// 		uri: app.options.db,
  								// 		id: 'sort/by_path',
  								// 		data: {
  								// 			startkey: [path, host, "periodical", value],
  								// 			endkey: [path, host, "periodical", Date.now()],
  								// 			limit: limit,
  								// 			//limit: 60, //60 docs = 1 minute of docs
  								// 			inclusive_end: true,
  								// 			include_docs: true
  								// 		}
  								// 	})
  								// );

  								// views.push(_func);
                }//if value
              }.bind(app))


						}.bind(app));

            // debug_internals('fetch_history VIEWS %o', views);
            // while(views){
            //   let view = views.shift()
            //   view.attempt()
            // }
            // Array.each(views, function(view){
						// 	// view();
						// });

						//next(views);
						//app.hosts = {};
					}

				},


				// {
				// 	view: function(req, next, app){
				// 		let now = new Date();
				// 		debug_internals('fetch_history time %s', now);
        //
				// 		// let limit = 1;//only last doc
        //     let limit = 1000;//only last doc
        //
				// 		let views = [];
        //
        //     // console.log('sort by path', app.paths)
        //
				// 		Array.each(app.hosts, function(host, index){
				// 			debug_internals('fetch_history host %s', host);
				// 			//console.log(value);
        //
				// 			// if(value >= 0){
        //
        //
        //
        //         Array.each(app.paths, function(path){
        //
        //           let types = [DEFAULT_TYPE] //make an array to loop on "types"
        //
        //           if(path.indexOf('historical') == 0){
        //             // debug_internals('fetching Historical %s', path, path.indexOf('historical'));
        //             types = HISTORICAL_TYPES
        //           }
        //
        //           Array.each(types, function(type){
        //             let expire = DEFAULT_EXPIRE_SECONDS
        //
        //             if(HISTORICAL_EXPIRE_SECONDS[type]){
        //               expire = HISTORICAL_EXPIRE_SECONDS[type]
        //             }
        //
        //             debug_internals('fetching expire:type %s %d %s', path, expire, type);
        //
        //             // let cb = app.between({
        //             //   _extras: 'to_delete',
        //             //   uri: app.options.db+'/periodical',
        //             //   args: [
        //             //     [path, host, type, 0],
        //             //     [path, host, type, roundMilliseconds(Date.now() - (expire * 1000))],
        //             //     {
        //             //       index: 'sort_by_path',
        //             //       leftBound: 'open',
        //             //       rightBound: 'open'
        //             //     }
        //             //   ],
        //             //   field: 'id'
        //             // })
        //             let cb = app.delete({
        //               _extras: 'delete',
        //               uri: app.options.db+'/periodical',
        //               query: app.r.db(app.options.db).table('periodical').between(
        //                 [path, host, type, 0],
        //                 [path, host, type, roundMilliseconds(Date.now() - (expire * 1000))],
        //                 {
        //                   index: 'sort_by_path',
        //                   leftBound: 'open',
        //                   rightBound: 'open'
        //                 }
        //               ).limit(limit),
        //               args:{durability:"soft", return_changes: true}
        //             })
        //             // app.between({
        //             //   _extras: 'to_delete',
        //             //   uri: app.options.db+'/periodical',
        //             //   args: [
        //             //     [path, host, type, 0],
        //             //     [path, host, type, roundMilliseconds(Date.now() - (expire * 1000))],
        //             //     {
        //             //       index: 'sort_by_path',
        //             //       leftBound: 'open',
        //             //       rightBound: 'open'
        //             //     }
        //             //   ],
        //             //   field: 'id'
        //             // })
        //
    		// 							// app.view({
    		// 							// 	uri: app.options.db,
    		// 							// 	id: 'sort/by_path',
    		// 							// 	data: {
    		// 							// 		// startkey: [path, host, "periodical", Date.now() - 1000],//1.5 sec
    		// 							// 		// endkey: [path, host, "periodical", Date.now()],
        //               //     startkey: [path, host, type, 0],//1.5 sec
    		// 							// 		endkey: [path, host, type, Date.now() - (expire * 1000)],
    		// 							// 		// limit: limit,
    		// 							// 		//limit: 60, //60 docs = 1 minute of docs
    		// 							// 		inclusive_end: true,
    		// 							// 		include_docs: false
    		// 							// 	}
    		// 							// })
        //
        //
    		// 						views.push(cb);
        //
        //           })
        //
        //
        //         })
        //
        //
        //
				// 			// }
				// 		}.bind(app));
        //
				// 		Array.each(views, function(view){
				// 			view();
				// 		});
        //
				// 		//next(views);
				// 		//app.hosts = {};
				// 	}
        //
				// },

			],


		},

		routes: {
      between: [{
        path: ':database/:table',
        callbacks: ['between']
      }],
      // delete: [{
      //   path: ':database/:table',
      //   callbacks: ['delete']
      // }],

		},

  },
  // delete: function(err, resp, params){
  //   if(err){
  //     debug_internals('delete err', err)
  //   }
  //   else{
  //     //fireEvent to acknowledge deleted docs, maybe log
  //     debug_internals('delete resp', resp)
  //   }
  // },
  between: function(err, resp, params){
    debug_internals('between', params.options)

    if(err){
      debug_internals('between err', err)

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
      // if(params.options._extras == 'to_delete'){
      //   debug_internals('to_delete %o', resp);
      //   this.delete({
      //     _extras: 'delete',
      //     uri: this.options.db+'/periodical',
      //     args:[
      //       resp,
      //       {durability: 'soft'}
      //     ]
      //   })
      // }
      // else{
        resp.toArray(function(err, arr){
          debug_internals('between count', arr.length)


          if(params.options._extras == 'path'){
            if(arr.length == 0){
    					debug_internals('No paths yet');
    				}
    				else{

              this.paths = []

    					Array.each(arr, function(row, index){
    						// debug_internals('Path %s', row);
    						//this.hosts.push({name: doc.key, last: null});

    						// if(this.paths[doc.key] == undefined) this.hosts[doc.paths] = -1;
                if(
                  (
                    !this.blacklist_path
                    || (this.blacklist_path && this.blacklist_path.test(path) == false)
                  )
                  && !this.paths.contains(row.metadata['path'])
                )
                  this.paths.push(row.metadata['path'])

    					}.bind(this));

    					debug_internals('PATHs %o', this.paths);
    				}
    			}
          else if(params.options._extras == 'host'){
            if(arr.length == 0){
    					debug_internals('No hosts yet');
    				}
    				else{

    					Array.each(arr, function(row, index){
    						// debug_internals('Host %s', row);
    						//this.hosts.push({name: doc.key, last: null});

    						// if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;
                // if(!this.hosts.contains(row.metadata['host']))
                //   this.hosts.push(row.metadata['host'])
                let host = row.metadata['host']
                if(this.hosts[host] == undefined) this.hosts[host] = {}

    					}.bind(this));

    					debug_internals('HOSTs %o', this.hosts);
    				}
          }
          else if(params.options._extras.get_last_stat == true){
            debug_internals('between params.options._extras.get_last_stat %o', arr)
            if(arr.length == 0){//there are no historical for this host yet
              let host = params.options._extras.host
              let path = params.options._extras.path.replace('historical.', '');

              if(!this.hosts[host]) this.hosts[host] = {}

              this.hosts[host][path] = 0;

    					debug_internals('No historical for host %o', host);
    					debug_internals('HOSTs %o', this.hosts);

            }
            else{//if there are historical already, add perdiocal starting from "end"
    					//throw new Error('there are historical already:implement');
              let host = params.options._extras.host
              let path = params.options._extras.path.replace('historical.', '');

              // let last = resp[0].doc.metadata.range.end + 1;
              let last = arr[0].metadata['timestamp'] + 1

              if(!this.hosts[host]) this.hosts[host] = {}

    					this.hosts[host][path] = last;

              debug_internals('Hosts %o', this.hosts);

    				}
          }
          else if(params.options._extras.fetch_history == true){
            // if(params.options._extras.path == 'os.procs.cmd.stats')
              debug_internals('between params.options._extras.fetch_history %d %s %d', params.options._extras.from, params.options._extras.path, arr.length)

            this.hosts = {};

    				if(params.uri != ''){
    					this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1), JSON.decode(resp));//capitalize first letter
    				}
    				else{
    					this.fireEvent('onGet', [arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);
    				}

    				// let to_remove = [];

    				// if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
            if(arr.length > 0){
    					// Array.each(resp, function(doc){
    					// 	to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
    					// });

    					// resp = [resp];
              debug_internals('this.options.requests.current.type %s', this.options.requests.current.type)

    					this.fireEvent(
    						this[
    							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
    						],
    						[arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
    					);


    				}
    				else{//no docs

    				}

          }
          // else if(params.options._extras == 'to_delete'){
          //   debug_internals('to_delete %o', arr);
          //   this.delete({
          //     _extras: 'delete',
          //     uri: this.options.db+'/periodical',
          //     args:[
          //       resp,
          //       {durability: 'soft'}
          //     ]
          //   })
          // }


        }.bind(this))
      // }

    }



    // debug_internals('count', this.r.count(resp))

  },
  // search: function (err, resp, info){
  //
	// 	// debug('search %o', resp);
	// 	// debug('search info %o', info);
  //
	// 	if(err){
	// 		debug('search err %o', err);
  //
  //
	// 		if(info.uri != ''){
	// 			this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1)+'Error', err);//capitalize first letter
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
  //
	// 	}
	// 	else{
  //
	// 		//if(info.options.data.reduce == true && info.options.data.include_docs != true){
	// 		if(info.uri == this.options.db && info.options.id == 'search/hosts'){//comes from search/hosts
	// 			//this.hosts = {};
  //
	// 			if(Object.getLength(resp) == 0){//there are no docs.metadata.host yet
	// 				//this._add_periodical(host, 0, Date.now());
	// 				//throw new Error('No hosts yet: implement');
	// 				debug_internals('No hosts yet');
	// 			}
	// 			else{
	// 				//Array.each(resp, function(doc){
	// 					//debug_internals('Alerts search doc %o', doc);
	// 					////this.hosts.push(doc.key);
	// 					//this._get_last_stat(doc.key);//doc.key == host
	// 				//}.bind(this));
	// 				Array.each(resp, function(doc){
	// 					debug_internals('Host %s', doc.key);
	// 					//this.hosts.push({name: doc.key, last: null});
  //
	// 					if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;
  //
	// 				}.bind(this));
  //
	// 				debug_internals('HOSTs %o', this.hosts);
	// 			}
	// 		}
  //
  //     else if(info.uri == this.options.db && info.options.id == 'search/paths'){//comes from search/hosts
	// 			//this.hosts = {};
  //
	// 			if(Object.getLength(resp) == 0){
	// 				debug_internals('No paths yet');
	// 			}
	// 			else{
  //
  //         this.paths = []
  //
	// 				Array.each(resp, function(doc){
	// 					debug_internals('Path %s', doc.key);
	// 					//this.hosts.push({name: doc.key, last: null});
  //
	// 					// if(this.paths[doc.key] == undefined) this.hosts[doc.paths] = -1;
  //           if(!this.blacklist_path
  //             || (this.blacklist_path && this.blacklist_path.test(doc.key) == false)
  //           )
  //             this.paths.push(doc.key)
  //
	// 				}.bind(this));
  //
	// 				debug_internals('PATHs %o', this.paths);
	// 			}
	// 		}
  //
	// 		else{//from periodical views
  //
	// 			this.hosts = {};
  //
	// 			if(info.uri != ''){
	// 				this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1), JSON.decode(resp));//capitalize first letter
	// 			}
	// 			else{
	// 				this.fireEvent('onGet', resp);
	// 			}
  //
	// 			// let to_remove = [];
  //
	// 			if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
	// 				// Array.each(resp, function(doc){
	// 				// 	to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
	// 				// });
  //
  //         // debug_internals('DOCs %s', resp);
  //
	// 				resp = [resp];
  //
	// 				this.fireEvent(
	// 					this[
	// 						'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
	// 					],
	// 					resp
	// 				);
  //
  //
	// 			}
	// 			else{//no docs
  //
	// 			}
  //
	// 		}
	// 	}
  //
	// },

  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-historical', 'info', 'os-historical started');

  },

});
