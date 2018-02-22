'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSStats');
var debug_internals = require('debug')('Server:Apps:OSStats:Internals');
var debug_events = require('debug')('Server:Apps:OSStats:Events');

//let Helper = new Class({//cradle client to check "stats" db
  //Extends: App,

	//main : null,
	
  //options: {
		//routes:{
			//view: [
				//{
					//path: ':database',
					//callbacks: ['search'],
				//},
			//]
		//}
	//},
	////initialize: function(options){
		////this.main = main;
		////this.parent(options);
	////},
	////search: function (err, resp, info){
		
		////debug_internals('Stats search %o', resp);
		////debug_internals('Stats search info %o', info);
		
		////if(err){
			////debug('Stats search err %o', err);
		////}
		////else{
			////if(resp.length == 0){//there no matching stats, so start the view from 0
				//////this._add_periodical(host, 0, Date.now());
				////throw new Error('implement');
			////}
			////if(info.options.data.reduce == true && info.options.data.include_docs != true){//comes from get_hosts
				////Array.each(resp, function(doc){
					////debug_internals('Stats search doc %o', doc);
					////this.get_last(doc.key);
				////}.bind(this));
			////}
			////else{//from get_last
				////debug_internals('Stats search doc %o', resp[0].doc.metadata.range.end);
				////let host = resp[0].doc.metadata.host;
				////let last = resp[0].doc.metadata.range.end;
				
				/////**
				 ////* now that we have the last stats doc for this host,
				 ////* we can build our "perdiodical" requests
				 ////* */
				////this._add_periodical(host, last, Date.now());
						
				
			////}
		////}
		
			
		//////throw new Error();
	////},
	////_add_periodical: function(host, start, end){
		////debug_internals('_add_periodical %s %d %d', host, start, end);
		
		////let limit = 2;
		
		////this.historical.options.requests.periodical.push({
			////view: function(req, next){
				//////debug_internals("dinamically generated view %d", last);
				////next(
					////{
						////uri: 'dashboard',
						////id: 'sort/by_path_host',
						////data: {
							////endkey: ["periodical", "os", host, end],
							////startkey: ["periodical", "os", host, start],
							////limit: limit,
							//////limit: 60, //60 docs = 1 minute of docs
							////inclusive_end: true,
							////include_docs: true
						////}
					////}
				////)
				
				////start = Date.now();//update timestamp, so next time runs from this point
				////end = Date.now() + limit * 1000;//update timestamp, so next time runs from this point
			////}
		////});
		
		//////debug_internals('_add_periodical %o', this.historical);
		
		////if(this.historical)
			////this.historical.fireEvent('onPeriodicalRequestsUpdated');
	////},
	////get_last: function(host){
		////debug_internals('get_last %s', host);
		
		////this.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
			////uri: 'stats',
			////id: 'sort/os_stats_by_date',
			////data: {
				////startkey: [host, Date.now()],
				////endkey: [ host, 0],
				////limit: 1,
				////descending: true,
				////inclusive_end: true,
				////include_docs: true
			////}
		////});
	////},
	////get_hosts: function(){
		
		////debug_internals('get_hosts');
		
		////this.view({
			////uri: 'stats',
			////id: 'sort/os_stats_by_host',
			////data: {
				//////endkey: ["\ufff0"],
				//////startkey: [""],
				////reduce: true, //avoid geting duplicate host
				////group: true,
				//////limit: 1,
				//////limit: 60, //60 docs = 1 minute of docs
				////inclusive_end: true,
				//////include_docs: true
			////}
		////});
	////}
	
//});


		
module.exports = new Class({
  Extends: App,
  
  hosts: {},
  
  periodicals: {},
  
  options: {
		
		id: 'os.stats',
		
		requests : {
			//once: [
				//{
					//////view: function(req, next){
						//////next(
							//view: {
								//uri: 'dashboard',
								//id: 'search/hosts',
								//data: {
									//reduce: true, //avoid geting duplicate host
									//group: true,
									//inclusive_end: true,
								//}
							//}
							
						//////);
					//////}
				//},
				
			//],
			periodical: [
				{
					view: function(req, next, app){
						let now = new Date();
						debug_internals('fetch_history time %s', now);
						
						let limit = 60;//60 docs = 1 minute of historical data
						
						let views = [];
						
						Object.each(app.hosts, function(value, host){
							debug_internals('fetch_history value %d', value);
							//console.log(value);
							
							if(value >= 0){
								
								debug_internals('fetch_history %s', host);
								
								let cb = next.pass(
									app.view({
										uri: 'dashboard',
										id: 'sort/by_path',
										data: {
											startkey: ["os", host, "periodical", value],
											endkey: ["os", host, "periodical", Date.now()],
											limit: limit,
											//limit: 60, //60 docs = 1 minute of docs
											inclusive_end: true,
											include_docs: true
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
						debug_internals('search_hosts');
						next({
							uri: 'dashboard',
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
						//debug_internals('_get_last_stat %o', next);
						debug_internals('_get_last_stat %o', app.hosts);
						
						let views = [];
						Object.each(app.hosts, function(value, host){
							debug_internals('_get_last_stat %s', host);
							
							let cb = next.pass(
								app.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
									uri: 'stats',
									id: 'sort/by_type',
									data: {
										startkey: ["minute", host, Date.now()],
										endkey: ["minute", host, 0],
										limit: 1,
										descending: true,
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
				}
			],
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
  //get_last_stats: function(err, resp, options){
		//debug_internals('get_last_stats %o', resp);
		//debug_internals('get_last_stats options %o', options);
		
		//if(err)
			//debug_internals('get_last_stats err %o', err);
	//},
  remove: function (err, resp, options){
		debug('remove %o', resp);
		debug('remove options %o', options);
		
		if(err)
			debug('remove err %o', err);
		
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
			if(info.uri == 'dashboard' && info.options.id == 'search/hosts'){//comes from search/hosts
				//this.hosts = {};
				
				if(Object.getLength(resp) == 0){//there are no docs.metadata.host yet
					//this._add_periodical(host, 0, Date.now());
					//throw new Error('No hosts yet: implement');
					debug_internals('No hosts yet');
				}
				else{
					//Array.each(resp, function(doc){
						//debug_internals('Stats search doc %o', doc);
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
			else if(info.uri == 'stats' && info.options.id == 'sort/by_type'){//_get_last_stat
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
					let last = resp[0].doc.metadata.range.end + 1;
					
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
				
				this.hosts = {};
				
				if(info.uri != ''){
					this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1), JSON.decode(resp));//capitalize first letter
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
					
					
					//this._get_last_stat(info.options.data.startkey[1]);//host
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
		}
		
		//if(err){
			//debug('search err %o', err);
			
			//if(options.uri != ''){
				//this.fireEvent('on'+options.uri.charAt(0).toUpperCase() + options.uri.slice(1)+'Error', err);//capitalize first letter
			//}
			//else{
				//this.fireEvent('onGetError', err);
			//}
			
			//this.fireEvent(this.ON_DOC_ERROR, err);
			
			////if(this.options.requests.current.type == 'once'){
				
				//this.fireEvent(
					//this[
						//'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
					//],
					//err
				//);
				
			////}
			////else{
				////this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
			////}
		//}
		//else{
			//////console.log('success');
			
			//if(options.uri != ''){
				//this.fireEvent('on'+options.uri.charAt(0).toUpperCase() + options.uri.slice(1), JSON.decode(resp));//capitalize first letter
			//}
			//else{
				//this.fireEvent('onGet', resp);
			//}
			
			//let to_remove = [];
			//if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
				//Array.each(resp, function(doc){
					//to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
				//});
				
				//resp = [resp];
				
				//this.fireEvent(
					//this[
						//'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
					//],
					//resp
				//);
				
				///**
				//* remove retrived docs
				//* 
				//* */
				////debug_internals('to remove %o',to_remove);

				////Array.each(to_remove, function(doc){
					////this.remove({uri: 'dashboard', id: doc.id, rev: doc.rev});
				////}.bind(this));

				///**
				 //* repeat the ON_ONCE search, to get next results
				 //* */
				////this.fireEvent(this.ON_ONCE, null);
			//}
			//else{//no docs
				////to_remove.push({id: resp.doc._id, rev: resp.doc._rev});
			//}
			
			
			
			
				
		//}
	},
	//info: function (err, resp){
		//debug_internals('info %o', resp);
		//debug_internals('info err %o', err);
	//},
  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		this.log('os-stats', 'info', 'os-stats started');

  },
  //_get_last_stat: function(host){
		//debug_internals('_get_last_stat %s', host);
		
		//this.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
			//uri: 'stats',
			//id: 'sort/by_host',
			//data: {
				//startkey: [host, Date.now()],
				//endkey: [ host, 0],
				//limit: 1,
				//descending: true,
				//inclusive_end: true,
				//include_docs: true
			//}
		//});
	//},
	_add_periodical: function(host, start, end){
		debug_internals('_add_periodical %s %d %d', host, start, end);
		
		let limit = 2;
		
		let periodical = {
			view: function(req, next){
				if(host == 'test'){
					debug_internals("dinamically generated view for host %s start %d", host, start);
					debug_internals("dinamically generated view for host %s end %d", host, end);
				}
				
				next(
					{
						uri: 'dashboard',
						id: 'sort/by_path',
						data: {
							startkey: ["os", host, "periodical", start],
							endkey: ["os", host, "periodical", end],
							limit: limit,
							//limit: 60, //60 docs = 1 minute of docs
							inclusive_end: true,
							include_docs: true
						}
					}
				)
				
				//start = end + 1;//update timestamp, so next time runs from this point
				//end = Date.now() + limit * 1000;//update timestamp, so next time runs from this point
				
				//this._get_last_stat(host);
				
			}
		};
		
		//debug_internals("view host %s", periodical.host);
		
		if(this.periodicals[host] == undefined){
			this.periodicals[host] = null;
		}

		let length = this.options.requests.periodical.push(periodical);
		this.periodicals[host] = length -1;
		
		//let found = false;
		
		//Array.each(this.options.requests.periodical, function(prev){
			//if(prev.view)
		//});
		
		//debug_internals('_add_periodical %o', this.historical);
		
		//if(this.historical)
		this.fireEvent('onPeriodicalRequestsUpdated');
		
		
	},
});

