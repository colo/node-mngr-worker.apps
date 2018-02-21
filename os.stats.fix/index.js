'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSStatsFix');
var debug_internals = require('debug')('Server:Apps:OSStatsFix:Internals');
var debug_events = require('debug')('Server:Apps:OSStatsFix:Events');
		
module.exports = new Class({
  Extends: App,
  
  hosts: {},
  
  periodicals: {},
  
  options: {
		
		id: 'os.stats',
		
		requests : {
			once: [
				{
					////view: function(req, next){
						////next(
							view: {
								uri: 'stats',
								id: 'sort/by_type',
								data: {
									startkey: ["periodical", ""],
									endkey: ["periodical", "\ufff0"],
									inclusive_end: true,
									include_docs: true
								}
							}
							
						////);
					////}
				},
				
			],
			periodical: [
			],
			range: [
			],
			
		},
		
		routes: {
			view: [
				{
					path: ':database',
					callbacks: ['search'],
				},
			]
		},
		
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
			if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
					
					resp = [resp];
					
					this.fireEvent(
						this[
							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
						],
						resp
					);
					
			}
					
		}
		
		
	},

  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		this.log('os-stats', 'info', 'os-stats started');

  },
  
});

