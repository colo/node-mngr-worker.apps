'use strict'

// var App = require('node-app-http-client');
var debug = require('debug')('Server:Apps:Logs:Nginx:Input:Http');
var debug_internals = require('debug')('Server:Apps:Logs:Nginx:Input:Http:Internals');


const App = require('node-app-http-client')
const parse = require('node-html-parser').parse
const esprima = require('esprima')

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',

  options: {

		requests : {
			once: [
				{ get: {uri: '' } },
			],
			// periodical: [
			// 	{ api: { get: {uri: ''} } },
			// ],

		},

		routes: {
			get: [
				// {
				// 	path: ':prop',
				// 	callbacks: ['get'],
				// 	//version: '',
				// },
				{
					path: '',
					callbacks: ['get'],
					//version: '',
				},
			]
		},

		// api: {
    //
		// 	version: '1.0.0',
    //
		// 	routes: {
		// 		get: [
		// 			{
		// 				path: ':prop',
		// 				callbacks: ['get'],
		// 				//version: '',
		// 			},
		// 			{
		// 				path: '',
		// 				callbacks: ['get'],
		// 				//version: '',
		// 			},
		// 		]
		// 	},
    //
		// },
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
    // debug_internals(err, resp, body, req)



		if(err){
			//console.log(err);

			if(req.uri != ''){
				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
			}
			else{
				this.fireEvent('onGetError', err);
			}

			this.fireEvent(this.ON_DOC_ERROR, err);

			if(this.options.requests.current.type == 'once'){
				this.fireEvent(this.ON_ONCE_DOC_ERROR, err);
			}
			else{
				this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
			}
		}
		else{
			////console.log('success');

      let root = parse(body, {script: true})
      let text = root.text
      let js = text.substring(text.indexOf('var socket'), text.indexOf('});')+3)
      // debug_internals('get', js)
      // debug_internals('get parse %O', esprima.parse(js))
      // debug_internals('get tokenize %O', esprima.tokenize(js))
      let socket_io = {
        ns: undefined,
        path: undefined,
        domain: this.options.domain
      }

      Array.each(esprima.tokenize(js), function(token){
        if(token.type === 'String'){
          if(!socket_io.ns) socket_io.ns = token.value.replace(/(\\|\')/g, '')
          else socket_io.path = token.value.replace(/(\\|\')/g, '')
        }
      })

      debug_internals('get', socket_io)

      // this.fireEvent(this.ON_ONCE_DOC, socket_io)
      this.fireEvent(
        this.ON_DOC,
        [{'socket.io' : socket_io}, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
      )

      // if(req.uri != ''){
			// 	this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), decoded_body);//capitalize first letter
			// }
			// else{
			// 	this.fireEvent('onGet', decoded_body);
			// }
      //
			// //this.fireEvent(this.ON_DOC, JSON.decode(body));
      //
			// if(this.options.requests.current.type == 'once'){
			// 	this.fireEvent(this.ON_ONCE_DOC, decoded_body);
			// }
			// else{
			// 	// var original = JSON.decode(body);
			// 	var doc = {};
      //
			// 	doc.loadavg = decoded_body.loadavg;
			// 	doc.uptime = decoded_body.uptime;
			// 	doc.freemem = decoded_body.freemem;
			// 	doc.totalmem = decoded_body.totalmem;
			// 	doc.cpus = decoded_body.cpus;
			// 	doc.networkInterfaces = decoded_body.networkInterfaces;
      //
			// 	this.fireEvent(this.ON_PERIODICAL_DOC, doc);
      //
			// 	////console.log('STATUS');
			// }






		}

  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('frontail-input', 'info', 'frontail-input started');
  },


});
