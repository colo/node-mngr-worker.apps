'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSStats');
var debug_internals = require('debug')('Server:Apps:OSStats:Internals');
var debug_events = require('debug')('Server:Apps:OSStats:Events');

let Stats = new Class({//cradle client to check "stats" db
  Extends: App,
  
  historical: null,
  
  options: {
		//host: '192.168.0.180',
		host: '127.0.0.1',
		port: 5984,
		db: 'stats',
		opts: {
			cache: true,
			raw: false,
			forceSave: true,
		},
		routes:{
			view: [
				{
					path: ':database',
					callbacks: ['search'],
				},
			]
		}
	},
	initialize: function(historical){
		this.historical = historical;
		this.parent();
	},
	search: function (err, resp, info){
		
		debug_internals('Stats search %o', resp);
		debug_internals('Stats search info %o', info);
		
		if(err){
			debug('Stats search err %o', err);
		}
		else{
			if(resp.length == 0){//there no matching stats, so start the view from 0
				//this._add_periodical(host, 0, Date.now());
				throw new Error('implement');
			}
			if(info.options.data.reduce == true && info.options.data.include_docs != true){//comes from get_hosts
				Array.each(resp, function(doc){
					debug_internals('Stats search doc %o', doc);
					this.get_last(doc.key);
				}.bind(this));
			}
			else{//from get_last
				debug_internals('Stats search doc %o', resp[0].doc.metadata.range.end);
				let host = resp[0].doc.metadata.host;
				let last = resp[0].doc.metadata.range.end;
				
				/**
				 * now that we have the last stats doc for this host,
				 * we can build our "perdiodical" requests
				 * */
				this._add_periodical(host, last, Date.now());
						
				
			}
		}
		
			
		//throw new Error();
	},
	_add_periodical: function(host, start, end){
		debug_internals('_add_periodical %s %d %d', host, start, end);
		
		let limit = 2;
		
		this.historical.options.requests.periodical.push({
			view: function(req, next){
				//debug_internals("dinamically generated view %d", last);
				next(
					{
						uri: 'dashboard',
						id: 'sort/by_path_host',
						data: {
							endkey: ["periodical", "os", host, end],
							startkey: ["periodical", "os", host, start],
							limit: limit,
							//limit: 60, //60 docs = 1 minute of docs
							inclusive_end: true,
							include_docs: true
						}
					}
				)
				
				start = Date.now();//update timestamp, so next time runs from this point
				end = Date.now() + limit * 1000;//update timestamp, so next time runs from this point
			}
		});
		
		//debug_internals('_add_periodical %o', this.historical);
		
		if(this.historical)
			this.historical.fireEvent('onPeriodicalRequestsUpdated');
	},
	get_last: function(host){
		debug_internals('get_last %s', host);
		
		this.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
			uri: 'stats',
			id: 'sort/os_stats_by_date',
			data: {
				startkey: [host, Date.now()],
				endkey: [ host, 0],
				limit: 1,
				descending: true,
				inclusive_end: true,
				include_docs: true
			}
		});
	},
	get_hosts: function(){
		
		debug_internals('get_hosts');
		
		this.view({
			uri: 'stats',
			id: 'sort/os_stats_by_host',
			data: {
				//endkey: ["\ufff0"],
				//startkey: [""],
				reduce: true, //avoid geting duplicate host
				group: true,
				//limit: 1,
				//limit: 60, //60 docs = 1 minute of docs
				inclusive_end: true,
				//include_docs: true
			}
		});
	}
	
});


		
		
module.exports = new Class({
  Extends: App,
  
  options: {
		
		id: 'os.stats',
		
		requests : {
			once: [
				//{
					////view: function(req, next){
						////next(
							//view: {
								//uri: 'dashboard',
								//id: 'sort/by_path_host',
								//data: {
									//endkey: ["periodical", "os", "\ufff0"],
									//startkey: ["periodical", "os", ""],
									////limit: 2,
									//limit: 1024,
									//inclusive_end: true,
									//include_docs: true
								//}
							//}
							
						////);
					////}
				//},
				
			],
			periodical: [],
			//periodical: [
				//{
					////view: function(req, next){
						////next(
						//view:	{
								//uri: 'dashboard',
								//id: 'sort/by_path_host',
								//data: {
									//endkey: ["periodical", "os", "\ufff0"],
									//startkey: ["periodical", "os", ""],
									////limit: 2,
									//limit: 60, //60 docs = 1 minute of docs
									//inclusive_end: true,
									//include_docs: true
								//}
							//}
							
						////);
					////}
				//},
				
			//],
			range: [
				//{ get: {uri: 'dashboard/cache', doc: 'localhost.colo.os.blockdevices@1515636560970'} },
				{
					view: function(req, next){
						//console.log('--PRE FUNCTION---')
						//console.log(req.opt);
						next(
							{
								uri: 'dashboard',
								id: 'periodical/by_path_host',
								data: {
									//endkey: ["os", "localhost.colo\ufff0"],
									//startkey: ["os", "localhost.colo"],
									endkey: ["periodical", "os", "localhost.colo", req.opt.range.end],
									startkey: ["periodical", "os", "localhost.colo", req.opt.range.start],
									//descending: true,
									limit: 2,
									inclusive_end: true,
									include_docs: true
								}
							}
							//{
								//uri: 'dashboard',
								//id: 'periodical/by_date',
								//data: {
									//endkey: [req.opt.range.end, "localhost.colo"],
									//startkey: [req.opt.range.start, "localhost.colo"],
									////descending: true,
									////limit: 2,
									//inclusive_end: true,
									//include_docs: true
								//}
							//}
						);
					}
				},
				
			],
			
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
  remove: function (err, resp, options){
		debug('remove %o', resp);
		debug('remove options %o', options);
		
		if(err)
			debug('remove err %o', err);
		
	},
	search: function (err, resp, options){
		
		debug('search %o', resp);
		debug('search type %o', typeof(resp));
		debug('search options %o', options);
		
		if(err){
			debug('search err %o', err);
			
			if(options.uri != ''){
				this.fireEvent('on'+options.uri.charAt(0).toUpperCase() + options.uri.slice(1)+'Error', err);//capitalize first letter
			}
			else{
				this.fireEvent('onGetError', err);
			}
			
			this.fireEvent(this.ON_DOC_ERROR, err);
			
			//if(this.options.requests.current.type == 'once'){
				
				this.fireEvent(
					this[
						'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
					],
					err
				);
				
			//}
			//else{
				//this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
			//}
		}
		else{
			////console.log('success');
			
			if(options.uri != ''){
				this.fireEvent('on'+options.uri.charAt(0).toUpperCase() + options.uri.slice(1), JSON.decode(resp));//capitalize first letter
			}
			else{
				this.fireEvent('onGet', resp);
			}
			
			let to_remove = [];
			if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
				Array.each(resp, function(doc){
					to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
				});
				
				resp = [resp];
				
				this.fireEvent(
					this[
						'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
					],
					resp
				);
				
				/**
				* remove retrived docs
				* 
				* */
				//debug_internals('to remove %o',to_remove);

				//Array.each(to_remove, function(doc){
					//this.remove({uri: 'dashboard', id: doc.id, rev: doc.rev});
				//}.bind(this));

				/**
				 * repeat the ON_ONCE search, to get next results
				 * */
				//this.fireEvent(this.ON_ONCE, null);
			}
			else{//no docs
				//to_remove.push({id: resp.doc._id, rev: resp.doc._rev});
			}
			
			
			
			
				
		}
	},
	//info: function (err, resp){
		//debug_internals('info %o', resp);
		//debug_internals('info err %o', err);
	//},
  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		let stats = new Stats(this);
		stats.get_hosts();
		
		this.log('os-stats', 'info', 'os-stats started');

  },
  
	
});

