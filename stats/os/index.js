'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSStats');
var debug_internals = require('debug')('Server:Apps:OSStats:Internals');
var debug_events = require('debug')('Server:Apps:OSStats:Events');

module.exports = new Class({
  Extends: App,
  
  options: {
		
		id: 'os.stats',
		
		requests : {
			once: [
				{
					view: function(req, next){
						next(
							{
								uri: 'dashboard',
								id: 'sort/by_path_host',
								data: {
									endkey: ["periodical", "os", "\ufff0"],
									startkey: ["periodical", "os", ""],
									//limit: 2,
									limit: 1024,
									inclusive_end: true,
									include_docs: true
								}
							}
							
						);
					}
				},
				
			],
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
				debug_internals('to remove %o',to_remove);

				Array.each(to_remove, function(doc){
					this.remove({uri: 'dashboard', id: doc.id, rev: doc.rev});
				}.bind(this));

				/**
				 * repeat the ON_ONCE search, to get next results
				 * */
				this.fireEvent(this.ON_ONCE, null);
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
		
		this.log('os-stats', 'info', 'os-stats started');

  },
  
	
});

