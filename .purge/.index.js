'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSPurge');
var debug_internals = require('debug')('Server:Apps:OSPurge:Internals');
var debug_events = require('debug')('Server:Apps:OSPurge:Events');


module.exports = new Class({
  Extends: App,

  hosts: {},

  //periodicals: {},

  options: {

		id: 'os.purge',

		requests : {

			periodical: [
        {
					view: function(req, next, app){
						debug_internals('search_hosts');
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

						let limit = 300;//60 docs = 1 minute of historical data

						let views = [];

						Object.each(app.hosts, function(value, host){
							debug_internals('fetch_history value %d', value);
							//console.log(value);

							//let range = Date.now() - 86400000;//always keep last day
							// let range = Date.now() - 43200000;//always keep last 12hs
							let range = Date.now() - 3600000;//always keep last hour
							// let range = Date.now() - 300000;//test, 5 minutes

							debug_internals('fetch NOW %s', new Date(Date.now()));
							debug_internals('fetch range %s', new Date(range));
							debug_internals('fetch value %s', new Date(value));

							if(value >= 0 && value < range){


								debug_internals('fetch_history %s', host);

								let cb = next.pass(
									app.view({
										uri: app.options.db,
										id: 'sort/by_path',
										data: {
											startkey: ["os", host, "periodical", range],
											endkey: ["os", host, "periodical", value],
											descending: true,
											//limit: limit,
											inclusive_end: true,
											//include_docs: true
										}
									})
								);

								views.push(cb);

							}
						}.bind(app));

						Array.each(views, function(view){
							view.attempt();
						});

						//next(views);
						//app.hosts = {};
					}

				},
				{
					view: function(req, next, app){
						//debug_internals('_get_first_stat %o', next);
						debug_internals('_get_first_stat %o', app.hosts);

						let views = [];
						Object.each(app.hosts, function(value, host){
							debug_internals('_get_first_stat %s', host);

							let cb = next.pass(
								app.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
									// uri: 'stats',
									// id: 'sort/by_type',
									uri: app.options.db,
									id: 'sort/by_path',
									data: {
										// startkey: ['minute', host, 0],
										// endkey: ['minute',  host, Date.now()],
										startkey: ["stats.os", host, "minute", 0],
                    endkey: ["stats.os", host, "minute", Date.now()],
										limit: 1,
										//descending: true,
										inclusive_end: true,
										include_docs: true
									}
								})
							);

							views.push(cb);


						});

						Array.each(views, function(view){
							view.attempt();
						});
						//next(views);
					}
				},
				//marking docs as _deleted and then comnpacting is more efficient than using the delete api
				{
					compact: function(req, next, app){
						app.compact({
							uri: app.options.db,
						})
					}
				}
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
			// 				//{
			// 					//uri: 'dashboard',
			// 					//id: 'periodical/by_date',
			// 					//data: {
			// 						//endkey: [req.opt.range.end, "localhost.colo"],
			// 						//startkey: [req.opt.range.start, "localhost.colo"],
			// 						////descending: true,
			// 						////limit: 2,
			// 						//inclusive_end: true,
			// 						//include_docs: true
			// 					//}
			// 				//}
			// 			);
			// 		}
			// 	},
      //
			// ],

		},

		routes: {
			//info: [
				//{
					//path: ':database',
					//callbacks: ['info'],
					////version: '',
				//},
				//{
					//path: '',
					//callbacks: ['info'],
					////version: '',
				//},
			//],
			compact: [
				{
					path: ':database',
					callbacks: ['compact'],
				}
			],
			save: [
				{
					path: ':database',
					callbacks: ['save'],
				}
			],
			remove: [
				{
					path: ':database',
					callbacks: ['remove'],
				}
			],
			view: [
				{
					path: ':database',
					callbacks: ['search'],
					//version: '',
				},
			]
		},

  },
	compact: function (err, resp, options){
		debug('compact %o', resp);
		debug('compact options %o', options);

		if(err)
			debug('compact err %o', err);

	},
  remove: function (err, resp, options){
		debug('remove %o', resp);
		debug('remove options %o', options);

		if(err)
			debug('remove err %o', err);

	},
	save: function (err, resp, options){
		debug('save %o', resp);
		debug('save options %o', options);

		if(err)
			debug('save err %o', err);

	},
	search: function (err, resp, info){

		debug('search %o', resp);
		debug('search info %o', info);

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
						//debug_internals('Purge search doc %o', doc);
						////this.hosts.push(doc.key);
						//this._get_first_stat(doc.key);//doc.key == host
					//}.bind(this));
					Array.each(resp, function(doc){
						debug_internals('Host %s', doc.key);
						//this.hosts.push({name: doc.key, last: null});

						if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;

					}.bind(this));

					debug_internals('HOSTs %o', this.hosts);
				}
			}
			// else if(info.uri == 'stats' && info.options.id == 'sort/by_type'){//_get_first_stat
			else if(info.options.id == 'sort/by_path' && info.options.data.startkey[0] == "stats.os"){//_get_last_stat
				//this.options.requests.periodical = [];

				//console.log(Object.getLength(resp));
				if(Object.getLength(resp) == 0){//there are no stats for this host yet
					let host = info.options.data.startkey[1];
					this.hosts[host] = 0;

					debug_internals('No stats for host %o', host);
					debug_internals('HOSTs %o', this.hosts);
					//this._add_periodical(info.options.data.startkey[0], 0, Date.now());

				}
				else{//if there are stats already, add perdiocal starting from "end"
					//throw new Error('there are stats already:implement');
					let host = resp[0].doc.metadata.host;
					let last = resp[0].doc.metadata.range.start - 1;

					this.hosts[host] = last;
					debug_internals('Hosts %o', this.hosts);

					/**
					 * now that we have the last stats doc for this host,
					 * we can build our "perdiodical" requests
					 * */
					//if(this.periodicals[host] != undefined){
						//let prev = this.periodicals[host];
						//delete this.options.requests.periodical[prev];
						//debug_internals("delete %s from index %d", host, prev);
						//this.fireEvent('onPeriodicalRequestsUpdated');
					//}

					//this._add_periodical(host, last, Date.now());
				}

			}
			else{//from periodical views

				debug_internals('from fetch hist %o', resp);

				this.hosts = {};

				//if(info.uri != ''){
					//this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1), JSON.decode(resp));//capitalize first letter
				//}
				//else{
					//this.fireEvent('onGet', resp);
				//}

				let to_remove = [];

				if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
					Array.each(resp, function(doc, index){
						to_remove.push({_id: doc.id, _rev: doc.value, _deleted: true});
						//doc._deleted = true;

						if(index == resp.length - 1){
							//resp = [resp];

							//this.fireEvent(
								//this[
									//'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
								//],
								//resp
							//);
							this.save({uri: 'dashboard', data: to_remove});
						}
					}.bind(this));


					//resp = [resp];

					//this.fireEvent(
						//this[
							//'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
						//],
						//resp
					//);



					/**
					* remove retrived docs
					*
					* */
					//debug_internals('to remove %o',to_remove);

					/*Array.each(to_remove, function(doc){
						this.remove({uri: 'dashboard', id: doc.id, rev: doc.rev});
					}.bind(this));*/

					/**
					 * repeat the ON_ONCE search, to get next results
					 * */
					//this.fireEvent(this.ON_ONCE, null);
				}
				//else{//no docs
					////to_remove.push({id: resp.doc._id, rev: resp.doc._rev});
				//}

			}
		}

	},
	initialize: function(options){


		this.parent(options);//override default options

		this.log('os-purge', 'info', 'os-purge started');

  },

});