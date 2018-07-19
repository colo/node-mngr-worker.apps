'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OS:Purge:Historical');
var debug_internals = require('debug')('Server:Apps:OS:Purge:Historical:Internals');
var debug_events = require('debug')('Server:Apps:OS:Purge:Historical:Events');

// const EXPIRE_SECONDS = 60 * 60 //one hour
// const HISTORICAL_MINUTE_EXPIRE_SECONDS = {
//   "minute": 60 * 60 * 24, //24hs
//   "hour": 60 * 60 * 24 * 7 //one week
// }


/**
* test
**/
const DEFAULT_EXPIRE_SECONDS = 60 //one min
const HISTORICAL_EXPIRE_SECONDS = {
  "minute": 60 * 10, //10 min
  "hour": 60 * 30 //30 min
}


const DEFAULT_TYPE = "periodical"
const HISTORICAL_TYPES = ["minute", "hour"]

module.exports = new Class({
  Extends: App,

  hosts: {},
  // blacklist_path: /historical/,
  blacklist_path: undefined,
  paths: [],

  periodicals: {},

  options: {

		id: 'os.purge',

		requests : {
			periodical: [
        {
					view: function(req, next, app){
						// debug_internals('search_hosts', app.options);
						next({
							uri: app.options.db,
							id: 'search/paths',
							data: {
								reduce: true, //avoid geting duplicate host
								group: true,
								inclusive_end: true,
							}
						})
					}
				},
        {
					view: function(req, next, app){
						// debug_internals('search_hosts', app.options);
						next({
							uri: app.options.db,
							id: 'search/hosts',
							data: {
								reduce: true, //avoid geting duplicate host
								group: true,
								inclusive_end: true,
							}
						})
					}
				},
				{
					view: function(req, next, app){
						let now = new Date();
						debug_internals('fetch_history time %s', now);

						// let limit = 1;//only last doc
            let limit = 100;//only last doc

						let views = [];

            // console.log('sort by path', app.paths)

						Object.each(app.hosts, function(value, host){
							debug_internals('fetch_history value %d', value);
							//console.log(value);

							// if(value >= 0){

								debug_internals('fetch_history %s', host);

                Array.each(app.paths, function(path){

                  let types = [DEFAULT_TYPE] //make an array to loop on "types"

                  if(path.indexOf('historical') == 0){
                    // debug_internals('fetching Historical %s', path, path.indexOf('historical'));
                    types = HISTORICAL_TYPES
                  }

                  Array.each(types, function(type){
                    let expire = DEFAULT_EXPIRE_SECONDS

                    if(HISTORICAL_EXPIRE_SECONDS[type]){
                      expire = HISTORICAL_EXPIRE_SECONDS[type]
                    }

                    debug_internals('fetching expire:type %s %d %s', path, expire, type);

                    let cb = next.pass(
    									app.view({
    										uri: app.options.db,
    										id: 'sort/by_path',
    										data: {
    											// startkey: [path, host, "periodical", Date.now() - 1000],//1.5 sec
    											// endkey: [path, host, "periodical", Date.now()],
                          startkey: [path, host, type, 0],//1.5 sec
    											endkey: [path, host, type, Date.now() - (expire * 1000)],
    											limit: limit,
    											//limit: 60, //60 docs = 1 minute of docs
    											inclusive_end: true,
    											include_docs: false
    										}
    									})
    								);

    								views.push(cb);

                  })


                })



							// }
						}.bind(app));

						Array.each(views, function(view){
							view.attempt();
						});

						//next(views);
						//app.hosts = {};
					}

				},

				// {
				// 	view: function(req, next, app){
				// 		//debug_internals('_get_last_stat %o', next);
				// 		debug_internals('_get_last_stat %o', app.hosts);
        //
				// 		let views = [];
				// 		Object.each(app.hosts, function(value, host){
				// 			debug_internals('_get_last_stat %s', host);
        //
				// 			let cb = next.pass(
				// 				app.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
				// 					// uri: 'alerts',
        //           uri: app.options.db,
				// 					id: 'sort/by_path',
				// 					data: {
				// 						// startkey: ["minute", host, Date.now()],
				// 						// endkey: ["minute", host, 0],
        //             startkey: ["os.alerts", host, "minute", Date.now()],
        //             endkey: ["os.alerts", host, "minute", 0],
				// 						limit: 1,
				// 						descending: true,
				// 						inclusive_end: true,
				// 						include_docs: true
				// 					}
				// 				})
				// 			);
        //
				// 			views.push(cb);
        //
        //
				// 		});
        //
				// 		Array.each(views, function(view){
				// 			view.attempt();
				// 		});
				// 		//next(views);
				// 	}
				// }
			],
			// range: [
			// 	//{ get: {uri: 'dashboard/cache', doc: 'localhost.colo.os.blockdevices@1515636560970'} },
			// 	{
			// 		view: function(req, next){
			// 			//console.log('--PRE FUNCTION---')
			// 			//console.log(req.opt);
			// 			next(
			// 				{
			// 					uri: 'dashboard',
			// 					id: 'periodical/by_path_host',
			// 					data: {
			// 						//endkey: ["os", "localhost.colo\ufff0"],
			// 						//startkey: ["os", "localhost.colo"],
			// 						endkey: ["periodical", "os", "localhost.colo", req.opt.range.end],
			// 						startkey: ["periodical", "os", "localhost.colo", req.opt.range.start],
			// 						//descending: true,
			// 						limit: 2,
			// 						inclusive_end: true,
			// 						include_docs: true
			// 					}
			// 				}
      //
			// 			);
			// 		}
			// 	},
      //
			// ],

		},

		routes: {
      view: [
				{
					path: ':database',
					callbacks: ['search'],
					//version: '',
				},
			]
		},

  },

  search: function (err, resp, info){

		// debug('search %o', resp);
		// debug('search info %o', info);

		if(err){
			debug('search err %o', err);


			if(info.uri != ''){
				this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1)+'Error', err);//capitalize first letter
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

			//if(info.options.data.reduce == true && info.options.data.include_docs != true){
			if(info.uri == this.options.db && info.options.id == 'search/hosts'){//comes from search/hosts
				//this.hosts = {};

				if(Object.getLength(resp) == 0){//there are no docs.metadata.host yet
					//this._add_periodical(host, 0, Date.now());
					//throw new Error('No hosts yet: implement');
					debug_internals('No hosts yet');
				}
				else{
					//Array.each(resp, function(doc){
						//debug_internals('Alerts search doc %o', doc);
						////this.hosts.push(doc.key);
						//this._get_last_stat(doc.key);//doc.key == host
					//}.bind(this));
					Array.each(resp, function(doc){
						debug_internals('Host %s', doc.key);
						//this.hosts.push({name: doc.key, last: null});

						if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;

					}.bind(this));

					debug_internals('HOSTs %o', this.hosts);
				}
			}

      else if(info.uri == this.options.db && info.options.id == 'search/paths'){//comes from search/hosts
				//this.hosts = {};

				if(Object.getLength(resp) == 0){
					debug_internals('No paths yet');
				}
				else{

          this.paths = []

					Array.each(resp, function(doc){
						debug_internals('Path %s', doc.key);
						//this.hosts.push({name: doc.key, last: null});

						// if(this.paths[doc.key] == undefined) this.hosts[doc.paths] = -1;
            if(!this.blacklist_path
              || (this.blacklist_path && this.blacklist_path.test(doc.key) == false)
            )
              this.paths.push(doc.key)

					}.bind(this));

					debug_internals('PATHs %o', this.paths);
				}
			}
      // else if(info.options.id == 'sort/by_path' && info.options.data.startkey[0] == "os.alerts"){//_get_last_stat
			// 	//this.options.requests.periodical = [];
      //
			// 	//console.log(Object.getLength(resp));
			// 	if(Object.getLength(resp) == 0){//there are no alerts for this host yet
			// 		let host = info.options.data.startkey[1];
			// 		this.hosts[host] = 0;
      //
			// 		debug_internals('No alerts for host %o', host);
			// 		debug_internals('HOSTs %o', this.hosts);
			// 		//this._add_periodical(info.options.data.startkey[0], 0, Date.now());
      //
			// 	}
			// 	else{//if there are alerts already, add perdiocal starting from "end"
			// 		//throw new Error('there are alerts already:implement');
			// 		let host = resp[0].doc.metadata.host;
			// 		let last = resp[0].doc.metadata.range.end + 1;
      //
			// 		this.hosts[host] = last;
			// 		debug_internals('Hosts %o', this.hosts);
      //
			// 		/**
			// 		 * now that we have the last alerts doc for this host,
			// 		 * we can build our "perdiodical" requests
			// 		 * */
			// 		//if(this.periodicals[host] != undefined){
			// 			//let prev = this.periodicals[host];
			// 			//delete this.options.requests.periodical[prev];
			// 			//debug_internals("delete %s from index %d", host, prev);
			// 			//this.fireEvent('onPeriodicalRequestsUpdated');
			// 		//}
      //
			// 		//this._add_periodical(host, last, Date.now());
			// 	}
      //
			// }
			else{//from periodical views

				this.hosts = {};

				if(info.uri != ''){
					this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1), JSON.decode(resp));//capitalize first letter
				}
				else{
					this.fireEvent('onGet', resp);
				}

				// let to_remove = [];

				if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
					// Array.each(resp, function(doc){
					// 	to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
					// });

          // debug_internals('DOCs %s', resp);

					resp = [resp];

					this.fireEvent(
						this[
							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
						],
						resp
					);


				}
				else{//no docs

				}

			}
		}

	},

  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-purge', 'info', 'os-purge started');

  },
	// _add_periodical: function(host, start, end){
	// 	debug_internals('_add_periodical %s %d %d', host, start, end);
  //
	// 	let limit = 2;
  //
	// 	let periodical = {
	// 		view: function(req, next){
	// 			if(host == 'test'){
	// 				debug_internals("dinamically generated view for host %s start %d", host, start);
	// 				debug_internals("dinamically generated view for host %s end %d", host, end);
	// 			}
  //
	// 			next(
	// 				{
	// 					uri: 'dashboard',
	// 					id: 'sort/by_path',
	// 					data: {
	// 						startkey: ["os", host, "periodical", start],
	// 						endkey: ["os", host, "periodical", end],
	// 						limit: limit,
	// 						//limit: 60, //60 docs = 1 minute of docs
	// 						inclusive_end: true,
	// 						include_docs: true
	// 					}
	// 				}
	// 			)
  //
  //
	// 		}
	// 	};
  //
	// 	//debug_internals("view host %s", periodical.host);
  //
	// 	if(this.periodicals[host] == undefined){
	// 		this.periodicals[host] = null;
	// 	}
  //
	// 	let length = this.options.requests.periodical.push(periodical);
	// 	this.periodicals[host] = length -1;
  //
  //
	// 	this.fireEvent('onPeriodicalRequestsUpdated');
  //
  //
	// },
});
