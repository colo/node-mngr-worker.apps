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
					//{
						//path: ':mount',
						//callbacks: ['get_mount'],
						//version: '',
					//},
					//{
						//path: ':mount/:prop',
						//callbacks: ['get_mount'],
						//version: '',
					//},
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				]
			},

		},
  },
  /**
   * need to send encoded "/" (%2F)
   *
   * */
  //get_mount: function (err, resp, body){
		////console.log('OS MOUNTS get_mount');

		////console.log('error');
		////console.log(err);

		//////console.log('resp');
		//////console.log(resp);

		////console.log('body');
		////console.log(body);
  //},
  //get: function (err, resp, body){
		////console.log('OS MOUNTS get');

		////console.log('error');
		////console.log(err);

		//////console.log('resp');
		//////console.log(resp);

		////console.log('body');
		////console.log(body);
  //},
  get: function (err, resp, body, req){
		//console.log('OS MOUNTS get');
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

      try{
        let decoded_body = {}
        decoded_body = JSON.decode(body)

  			if(req.uri != ''){
  				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), decoded_body);//capitalize first letter
  			}
  			else{
  				this.fireEvent('onGet', decoded_body);
  			}

  			//this.fireEvent(this.ON_DOC, decoded_body);

  			if(this.options.requests.current.type == 'once'){
  				this.fireEvent(this.ON_ONCE_DOC, [decoded_body] );
  			}
  			else{
  				//var original = decoded_body;
  				//var doc = {};

  				//doc.loadavg = original.loadavg;
  				//doc.uptime = original.uptime;
  				//doc.freemem = original.freemem;
  				//doc.totalmem = original.totalmem;
  				//doc.cpus = original.cpus;
  				//doc.networkInterfaces = original.networkInterfaces;

  				this.fireEvent(this.ON_PERIODICAL_DOC, [decoded_body] );
  				////console.log('STATUS');
  				////console.log(decoded_body);
  			}

      }
      catch(e){
        // console.log(e)
      }

		}

  },
  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-mounts', 'info', 'os-mounts started');
  },

});
