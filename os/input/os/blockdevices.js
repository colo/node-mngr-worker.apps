'use strict'

var App = require('node-app-http-client');




module.exports = new Class({
  Extends: App,

  options: {

	  requests : {
			// once: [
			// 	{ api: { get: {uri: ''} } },
			// ],
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
						path: ':device/:prop',
						callbacks: ['get'],
						version: '',
					},
					{
						path: ':device',
						callbacks: ['get'],
						version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				]
			},

		},
  },
  get: function (err, resp, body, req){
		//console.log('OS BLOCKDEVICES get');
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
			////console.log(JSON.decode(body));

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
				//var original = JSON.decode(body);
				//var doc = {};

				//doc.loadavg = original.loadavg;
				//doc.uptime = original.uptime;
				//doc.freemem = original.freemem;
				//doc.totalmem = original.totalmem;
				//doc.cpus = original.cpus;
				//doc.networkInterfaces = original.networkInterfaces;

				this.fireEvent(this.ON_PERIODICAL_DOC, JSON.decode(body));

				////console.log('STATUS');
			}


		}

  },
  //get: function (err, resp, body){
		////console.log('OS BLOCKDEVICES get');

		////console.log('error');
		////console.log(err);

		//////console.log('resp');
		//////console.log(resp);

		////console.log('body');
		////console.log(body);
  //},
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-blockdevices', 'info', 'os-blockdevices started');
  },
});
