'use strict'

var App = require('node-app-http-client');

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',

  options: {

		requests : {
			once: [
				{ api: { get: {uri: ''} } },
			],
			periodical: [
				{ api: { get: {uri: ''} } },
			],

		},

		routes: {
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
		//console.log('OS GET');
		//console.log(this.options.requests.current);

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

			if(req.uri != ''){
				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), JSON.decode(body));//capitalize first letter
			}
			else{
				this.fireEvent('onGet', JSON.decode(body));
			}

			//this.fireEvent(this.ON_DOC, JSON.decode(body));

			if(this.options.requests.current.type == 'once'){
				this.fireEvent(this.ON_ONCE_DOC, JSON.decode(body));
			}
			else{
				var original = JSON.decode(body);
				var doc = {};

				doc.loadavg = original.loadavg;
				doc.uptime = original.uptime;
				doc.freemem = original.freemem;
				doc.totalmem = original.totalmem;
				doc.cpus = original.cpus;
				doc.networkInterfaces = original.networkInterfaces;

				this.fireEvent(this.ON_PERIODICAL_DOC, doc);

				////console.log('STATUS');
			}


		}

  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os', 'info', 'os started');
  },


});
