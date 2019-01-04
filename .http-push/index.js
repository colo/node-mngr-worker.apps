'use strict'

var App = require('node-express-app'),
	path = require('path');
	


module.exports = new Class({
  Extends: App,
  
  app: null,
  logger: null,
  authorization:null,
  authentication: null,
  
  options: {
			
		id: 'InputPushHttpTest',
		path: '',
		
		authentication: null,
		
		routes: {
			
			get: [
				{
					path: '',
					callbacks: ['get'],
				},
			],
			
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: '',
						callbacks: ['get'],
					},
				],
			},
			
		},
  },
  
  get: function(req, res, next){

		res.status(202);
		
		res.format({
			'text/plain': function(){
				res.send('InputPushHttpTest');
			},

			'text/html': function(){
				res.send('InputPushHttpTest');
			},

			'application/json': function(){
				res.send({message: 'InputPushHttpTest'});
			},

		});
		
		this.fireEvent(this.ON_DOC, { info: 'test'});
		
  },
  
  initialize: function(options){
		
		this.profile('InputPushHttpTest_init');//start profiling
		
		this.parent(options);//override default options
		
		this.profile('InputPushHttpTest_init');//end profiling
		
		this.log('InputPushHttpTest', 'info', 'InputPushHttpTest started');
  },
	
});

