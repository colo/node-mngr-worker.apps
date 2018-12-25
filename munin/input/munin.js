'use strict'

let App = require('node-app-munin-client');

let debug = require('debug')('Server:Apps:Munin:Input');
let debug_internals = require('debug')('Server:Apps:Munin:Input:Internals');

let __white_black_lists_filter = function(whitelist, blacklist, str){
  let filtered = false
  if(!blacklist && !whitelist){
    filtered = true
  }
  else if(blacklist && !blacklist.test(str)){
    filtered = true
  }
  else if(blacklist && blacklist.test(str) && (whitelist && whitelist.test(str))){
    filtered = true
  }
  else if(!blacklist && (whitelist && whitelist.test(str))){
    filtered = true
  }

  return filtered
}

module.exports = new Class({
  Extends: App,

  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',
  modules: [],

  options: {

    // whitelist: /^(users|vmstat|nginx.*)/g,
    // blacklist: /^.*/g, //blacklist all modules
    whitelist: /^.*/g,
    // blacklist: /^[.]/g,
    blacklist: /^cpu$|^if.+$|^load$|^netstat$|^ntp.+$|^uptime$|^df$/g,

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

	fetch: function (err, resp, params){
		debug('save %o', resp);
		debug('save params %o', params);

		if(err){
			debug('save err %o', err);

      if(params.uri != ''){
				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
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
			////console.log('success');

			if(params.uri != ''){
				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1), [JSON.decode(resp), {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);//capitalize first letter
			}
			else{
				this.fireEvent('onGet', [JSON.decode(resp), {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);
			}


      //if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp))
				//resp = [resp];

			let doc = {};
			doc.data = resp
			doc.id = params.uri
      doc.host = this.options.host

      // debug_internals('OPTIONS', this.options.host)

			// this.fireEvent(
			// 	this[
			// 		'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
			// 	],
			// 	doc
			// );
      this.fireEvent(
        this[
          'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
        ],
        [doc, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
      )

		}
	},
	list: function (err, resp, params){
		debug_internals('list %o', resp);
		debug_internals('list params %o', params);

		if(err){
			debug_internals('list err %o', err);

      if(params.uri != ''){
				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
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
      let whitelist = this.options.whitelist
      let blacklist = this.options.blacklist
			Array.each(resp, function(module, index){
        // module = module.trim()

        // debug_internals('module %o', module, blacklist.test(module), whitelist.test(module));

        blacklist.lastIndex = 0
        whitelist.lastIndex = 0


        // if(blacklist == null || blacklist.test(module) == false)//not in blacklist
        //   if(whitelist == null || whitelist.test(module) == true)//if no whitelist, or in whitelist
        if(__white_black_lists_filter(whitelist, blacklist, module)){
			      this.options.requests.periodical.push( { fetch: { uri: module } });

            debug_internals('module %s', module);
        }

				if(index == resp.length - 1){
					// this.fireEvent(this.ON_PERIODICAL_REQUESTS_UPDATED);
          this.fireEvent(
            this['ON_PERIODICAL_REQUESTS_UPDATED'],
            [resp, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
          )
        }

        // blacklist.lastIndex = 0
        // whitelist.lastIndex = 0


			}.bind(this));

			// // this.fireEvent(this.ON_ONCE_DOC, [resp]);
      //
      // this.fireEvent(
      //   this[
      //     'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
      //   ],
      //   [resp, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
      // )
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
