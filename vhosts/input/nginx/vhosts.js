'use strict'

var debug = require('debug')('Server:Apps:Vhosts:Input:Nginx:Vhosts');
var debug_internals = require('debug')('Server:Apps:Vhosts:Input:Nginx:Vhosts:Internals');

let async = require('async')

// let request = require('request')
// let reqDefaults = request.defaults({
//   // forever:true,
//   agentOptions: {maxSockets: 999},
//   // pool: {maxSockets: Infinity, keepAlive:false}, keepAlive:false
// })

var App = require('node-app-http-client');

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',

  options: {
    // path: '/nginx/vhosts',

		requests : {
			once: [

			],
			periodical: [
				{ api: { get: {uri: '/enabled'} } },
			],

		},

    routes: {
      // get: [
      //   {
      //     path: ':prop',
      //     callbacks: ['get'],
      //     //version: '',
      //   },
      //   {
      //     path: '',
      //     callbacks: ['get'],
      //     //version: '',
      //   },
      // ]
    },

		api: {

			version: '1.0.0',

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
          {
						path: '/enabled/:prop/listen',
						callbacks: ['vhost_listen'],
						//version: '',
					},
          {
						path: '/enabled',
						callbacks: ['enabled'],
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
  vhost_listen: function (err, resp, body, req){
    // debug('vhost_listen %o %o', err, body, req.uri)

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
        let uri = req.uri.replace('/enabled/', '').replace('/listen', '')
        let decoded_body = JSON.decode(body)

        Array.each(decoded_body, function(listen){
          if(typeof listen !== 'string' && listen._value)
            listen = listen._value

          let port = listen.split(':')[1]
          let schema = (port.indexOf('ssl') > 0) ? 'https' : 'http'
          port = port.replace('ssl', '')
          port = port.trim()
          // debug('vhost_listen %o %o', listen, port, schema)
          this.fireEvent(this.ON_PERIODICAL_DOC, { metadata: {path: 'vhosts.nginx.enabled', tag: ['vhost','enabled', 'nginx', 'port', 'uri', 'url', 'schema', 'protocol']}, data: {uri: uri, port: port, schema: schema }});
        }.bind(this))

        // debug('vhost_listen %o %o', uri, decoded_body)


        // this.fireEvent(this.ON_PERIODICAL_DOC, { type: 'enabled', from: 'nginx', data: decoded_body });
      }
      catch(e){
        console.log(e)
      }
    }
  },
  enabled: function (err, resp, body, req){
    debug('enabled %o %o', err, body, req.uri)
		// console.log('OS GET');
		// console.log(this.options.requests.current);

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
      //   let decoded_body = {}
        let decoded_body = JSON.decode(body)

        this.options.requests.once = []

        let no_check = /^\_$/
        let requests = []
        Array.each(decoded_body, function(vhost){
          if(!no_check.test(vhost)){
            // this.options.requests.once.push({ api: { get: {uri: '/enabled/'+vhost+'/listen'} } })
            requests.push({ api: { get: {uri: '/enabled/'+vhost+'/listen'} } })
          }
        }.bind(this))

        debug('requests %O', requests)
        // process.exit(1)

        async.eachLimit(
          requests,
          1,
          function(request, callback){
            // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
            // callback()
            let wrapped = async.timeout(function(request){
              // sleep(1001).then( () => {
              //   // process.exit(1)
              //   debug('RANGE', range)
              // })


              // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
              this.options.requests.once = [request]
              this.fireEvent('onOnceRequestsUpdated')
              // process.exit(1)
              // callback()
            }.bind(this), 10)

            // try{
            wrapped(request, function(err, data) {
              if(err){
                // pipeline.get_input_by_id('input.periodical').fireEvent('onRange', range)
                callback()
              }
            })
            // }
            // catch(e){
            //   callback()
            // }
          }.bind(this)
        )




      //
      //   if(req.uri != ''){
  		// 		this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), decoded_body);//capitalize first letter
  		// 	}
  		// 	else{
  		// 		this.fireEvent('onGet', decoded_body);
  		// 	}
      //
  		// 	//this.fireEvent(this.ON_DOC, JSON.decode(body));
      //
  		// 	if(this.options.requests.current.type == 'once'){
  		// 		this.fireEvent(this.ON_ONCE_DOC, decoded_body);
  		// 	}
  		// 	else{
  		// 		// // var original = JSON.decode(body);
  		// 		// var doc = {};
      //     //
  		// 		// doc.loadavg = decoded_body.loadavg;
  		// 		// doc.uptime = decoded_body.uptime;
  		// 		// doc.freemem = decoded_body.freemem;
  		// 		// doc.totalmem = decoded_body.totalmem;
  		// 		// doc.cpus = decoded_body.cpus;
  		// 		// doc.networkInterfaces = decoded_body.networkInterfaces;
      //
  		// 		this.fireEvent(this.ON_PERIODICAL_DOC, { type: 'enabled', from: 'nginx', data: decoded_body });
      //
      //     // Array.each()
  		// 		////console.log('STATUS');
  		// 	}

      }
      catch(e){
        console.log(e)
      }




		}

  },

  get: function (err, resp, body, req){
    debug('get %o %o', err, body, req.uri)
		// console.log('OS GET');
		// console.log(this.options.requests.current);

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

  			//this.fireEvent(this.ON_DOC, JSON.decode(body));

  			if(this.options.requests.current.type == 'once'){
  				this.fireEvent(this.ON_ONCE_DOC, decoded_body);
  			}
  			else{
  				// // var original = JSON.decode(body);
  				// var doc = {};
          //
  				// doc.loadavg = decoded_body.loadavg;
  				// doc.uptime = decoded_body.uptime;
  				// doc.freemem = decoded_body.freemem;
  				// doc.totalmem = decoded_body.totalmem;
  				// doc.cpus = decoded_body.cpus;
  				// doc.networkInterfaces = decoded_body.networkInterfaces;

  				this.fireEvent(this.ON_PERIODICAL_DOC, { type: 'enabled', from: 'nginx', data: decoded_body });

          // Array.each()
  				////console.log('STATUS');
  			}

      }
      catch(e){
        console.log(e)
      }




		}

  },
  initialize: function(options){

    this.parent(options);//override default options
		// this.parent(options, reqDefaults);//override default options

		this.log('nginx', 'info', 'nginx started');
  },


});
