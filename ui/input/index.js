'use strict'

var debug = require('debug')('Server:Apps:UI:Input');
var debug_internals = require('debug')('Server:Apps:UI:Input:Internals');


var App = require('node-app-http-client');

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',

  options: {

    path: '/',
		requests : {
			// once: [
			// 	{ api: { get: {uri: ''} } },
			// ],
			periodical: [
				{ api: { get: {uri: ''} } },
			],

		},

    routes: {
      path: '/',
      get: [
        {
          path: ':prop',
          callbacks: ['get'],
          //version: '',
        },
        {
          path: '',
          callbacks: ['get'],
          //version: '',
        },
      ]
    },

		api: {

			version: '1.0.0',

			routes: {
				get: [
					{
						path: ':prop',
						callbacks: ['get'],
						//version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						//version: '',
					},
				]
			},

		},
  },
  //get_prop: function (err, resp, body, req){

		//if(err){
			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
		//}
		//else{
			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), body);//capitalize first letter
		//}

	//},
  get: function (err, resp, body, req){
    debug('get %o %o', err, body)


  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('ui input', 'info', 'ui input started');
  },


});
