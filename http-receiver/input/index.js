'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Input'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Input:Internals')


let HttpServer = require('js-pipeline.input.http-server')
// const bodyParser = require('body-parser'),
const express = require('express'),
      session = require('express-session'),
      compression = require('compression'),
      MemoryStore = require('memorystore')(session), //https://www.npmjs.com/package/memorystore
			cors = require('cors'),
			os = require('os')

module.exports = new Class({
  Extends: HttpServer,

  options: {
    // host: '127.0.0.1',
    // port: 8080,
		id: 'HttpReceiver',
		path: '',

    logs: {
			loggers: {
				error: null,
				access: null,
				profiling: null
			},

			path: './logs',

		},

		// // authentication: {
		// // 	users : [
		// // 			{ id: 1, username: 'anonymous' , role: 'anonymous', password: ''}
		// // 	],
		// // },
    //
		// logs: null,
    //
		// //authorization: {
		// 	//config: path.join(__dirname,'./rbac.json'),
		// //},
    //
		// // params: {
		// // 	event: /exit|resume|suspend|once|range/
		// // },

		middlewares: [
      compression(),
			express.json(),
			express.urlencoded({ extended: true }),
			cors({
				'exposedHeaders': ['Link', 'Content-Range']
			})
	  ],

    routes: {},
	  api: {

			version: '1.0.0',

			routes: {
				get: [
					{
						path: '',
						callbacks: ['get'],
            roles: ['mngr']
					}
				],
				post: [
					// {
					// 	path: ':prop',
					// 	callbacks: ['404'],
					// 	//version: '',
					// },
					{
						path: ':path',
						callbacks: ['post'],
            roles: ['mngr']
						//version: '',
					},
				],
        all: [

				]
			},

		},
  },
	get: function (req, resp, next){
    debug('GET %o', req.params, req.body, req.query)
		resp.json({id: this.options.id+':'+os.hostname()})
	},
  post: function (req, resp, next){
		debug('POST %o', req.params, req.body, req.query)
    resp.json({status: 'accepted'})
    process.exit(1)
    // next()
  },
  initialize: function(options){
    this.addEvent(this.ON_INIT_AUTHENTICATION, function(authentication){
      /**
  		 * add 'check_authentication' & 'check_authorization' to each route
  		 * */
  		Object.each(this.options.api.routes, function(routes, verb){

  			// if(verb != 'all'){
  				Array.each(routes, function(route){
  					// debug('route: ', verb, route);
  					// route.callbacks.unshift('check_authorization');
  					route.callbacks.unshift('check_authentication');
            debug('route: ', verb, route);

  					// if(verb == 'get')//users can "read" info
  					// 	route.roles = ['user']
  				}.bind(this));
  			// }

  		}.bind(this));

    }.bind(this));

    this.parent(options)

    this.options.session = session({
				store: new MemoryStore({
					checkPeriod: 3600000 // prune expired entries every hour
				}),
				cookie: { path: '/', httpOnly: true, maxAge: null, secure: false },
				secret: '19qX9cZ3yvjsMWRiZqOn',
				resave: true,
				saveUninitialized: false,
				name: 'mngr',
				unset: 'destroy'
		});





  }
})

// module.exports = new Class({
//   Extends: App,
//
//   //ON_CONNECT: 'onConnect',
//   //ON_CONNECT_ERROR: 'onConnectError',
//
//   options: {
//
// 		requests : {
// 			// once: [
// 			// 	{ api: { get: {uri: ''} } },
// 			// ],
// 			periodical: [
// 				{ api: { get: {uri: ''} } },
// 			],
//
// 		},
//
// 		routes: {
// 		},
//
// 		api: {
//
// 			version: '1.0.0',
//
// 			routes: {
// 				get: [
// 					{
// 						path: ':prop',
// 						callbacks: ['get'],
// 						//version: '',
// 					},
// 					{
// 						path: '',
// 						callbacks: ['get'],
// 						//version: '',
// 					},
// 				]
// 			},
//
// 		},
//   },
//   //get_prop: function (err, resp, body, req){
//
// 		//if(err){
// 			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
// 		//}
// 		//else{
// 			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), body);//capitalize first letter
// 		//}
//
// 	//},
//   get: function (err, resp, body, req){
// 		//console.log('OS GET');
// 		//console.log(this.options.requests.current);
//
// 		if(err){
// 			//console.log(err);
//
// 			if(req.uri != ''){
// 				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
// 			}
// 			else{
// 				this.fireEvent('onGetError', err);
// 			}
//
// 			this.fireEvent(this.ON_DOC_ERROR, err);
//
// 			if(this.options.requests.current.type == 'once'){
// 				this.fireEvent(this.ON_ONCE_DOC_ERROR, err);
// 			}
// 			else{
// 				this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
// 			}
// 		}
// 		else{
// 			////console.log('success');
//
//       try{
//         let decoded_body = {}
//         decoded_body = JSON.decode(body)
//
//         if(req.uri != ''){
//   				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), decoded_body);//capitalize first letter
//   			}
//   			else{
//   				this.fireEvent('onGet', decoded_body);
//   			}
//
//   			//this.fireEvent(this.ON_DOC, JSON.decode(body));
//
//   			if(this.options.requests.current.type == 'once'){
//   				this.fireEvent(this.ON_ONCE_DOC, decoded_body);
//   			}
//   			else{
//   				// var original = JSON.decode(body);
//   				var doc = {};
//
//   				doc.loadavg = decoded_body.loadavg;
//   				doc.uptime = decoded_body.uptime;
//   				doc.freemem = decoded_body.freemem;
//   				doc.totalmem = decoded_body.totalmem;
//   				doc.cpus = decoded_body.cpus;
//   				doc.networkInterfaces = decoded_body.networkInterfaces;
//
//   				this.fireEvent(this.ON_PERIODICAL_DOC, doc);
//
//   				////console.log('STATUS');
//   			}
//
//       }
//       catch(e){
//         console.log(e)
//       }
//
//
//
//
// 		}
//
//   },
//   initialize: function(options){
//
// 		this.parent(options);//override default options
//
// 		this.log('os', 'info', 'os started');
//   },
//
//
// });
