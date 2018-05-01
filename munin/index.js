'use strict'

var App = require('node-app-munin-client');

var debug = require('debug')('Server:Apps:Munin');
var debug_internals = require('debug')('Server:Apps:Munin:Internals');

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',
  modules: [],

  options: {

    whitelist: /^(users|vmstat|nginx.*)/g,
    // blacklist: /^.*/g, //blacklist all modules
    // whitelist: /^.*/img,
    blacklist: /^[.]/g,

		requests : {
			once: [
				{ list: { uri: '' } },
			],
			periodical: [
				//{ list: { uri: '' } },
				//{ fetch: { uri: 'cpu' } },
				//{ fetch: { uri: 'if_eth0' } },
				//{ config: { uri: 'if_eth0' } },
				//{ nodes: { uri: '' } },
				//{ quit: { uri: '' } },
			],
			//range: [
				////{ get: {uri: 'dashboard/cache', doc: 'localhost.colo.os.blockdevices@1515636560970'} },
			//],

		},

		routes: {
			fetch: [
				{
					path: ':module',
					callbacks: ['fetch']

				},
			],
			list: [
				{
					path: '',
					callbacks: ['list']

				},
			],
			//nodes: [
				//{
					//path: '',
					//callbacks: ['nodes']

				//},
			//],
			//quit: [
				//{
					//path: '',
					//callbacks: ['quit']

				//},
			//],
			//config: [
				//{
					//path: ':module',
					//callbacks: ['config']

				//},
			//],
		},

  },

	fetch: function (err, resp, options){
		debug('save %o', resp);
		debug('save options %o', options);

		if(err){
			debug('save err %o', err);

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


			//if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp))
				//resp = [resp];

			let doc = {};
			doc['data'] = resp;
			doc['id'] = options.uri;

			this.fireEvent(
				this[
					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
				],
				doc
			);


		}
	},
	list: function (err, resp, options){
		debug_internals('list %o', resp);
		debug_internals('list options %o', options);

		if(err){
			debug_internals('list err %o', err);
		}
		else{
      let whitelist = this.options.whitelist
      let blacklist = this.options.blacklist
			Array.each(resp, function(module, index){
        // module = module.trim()
        debug_internals('module %o', module, blacklist.test(module), whitelist.test(module));

        blacklist.lastIndex = 0
        whitelist.lastIndex = 0


        if(blacklist == null || blacklist.test(module) == false)//not in blacklist
          if(whitelist == null || whitelist.test(module) == true)//if no whitelist, or in whitelist
				      this.options.requests.periodical.push( { fetch: { uri: module } });


				if(index == resp.length - 1)
					this.fireEvent(this.ON_PERIODICAL_REQUESTS_UPDATED);

        // blacklist.lastIndex = 0
        // whitelist.lastIndex = 0


			}.bind(this));

			this.fireEvent(this.ON_ONCE_DOC, [resp]);
		}
	},
	//nodes: function (err, resp, options){
		//debug_internals('nodes %o', resp);
		//debug_internals('nodes options %o', options);
	//},
	//quit: function (err, resp, options){
		//debug_internals('quit %o', resp);
		//debug_internals('quit options %o', options);
	//},
	//config: function (err, resp, options){
		//debug_internals('config err %o', err);
		//debug_internals('config %o', resp);
		//debug_internals('config options %o', options);
	//},
  initialize: function(options){


		this.parent(options);//override default options

		this.log('munin', 'info', 'munin started');

		debug_internals('initialized %o', options);

  },


});
