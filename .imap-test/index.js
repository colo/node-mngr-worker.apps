'use strict'

var App = require('node-app-imap-client');

var debug = require('debug')('Server:Apps:Imap');

module.exports = new Class({
  Extends: App,
  
  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',
  
  options: {
		
		path: '',
		
		requests : {
			once: [
				//{
					//'search': {
						//uri: '',
						////uri: 'INBOX',
						////uri: 'INBOX/?openReadOnly=false', //readonly || openReadOnly
						////uri: '?openReadOnly=false',
						////uri: 'INBOX/?openReadOnly=false&modifiers.something=xxx',
						//opts: ['ALL']//search params
					//},
				//},
				{
					'seq.search': {
						uri: '',
						//uri: 'INBOX',
						//uri: 'INBOX/?openReadOnly=false', //readonly || openReadOnly
						//uri: '?openReadOnly=false',
						//uri: 'INBOX/?openReadOnly=false&something=xxx&something2=xxx',
						opts: ['1:10']//search params
					},
				},
				//{
					//'fetch': {
						//uri: '',
						////uri: 'INBOX',
						////uri: 'INBOX/?openReadOnly=false', //readonly || openReadOnly
						////uri: '?openReadOnly=false',
						////uri: 'INBOX/?openReadOnly=false&modifiers.something=xxx',
						//opts: [//fetch params
							//118574,
							//{//fetch options
								//bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
								//struct: true
							//}
						//]
					//}
				//},
				//{
					//'seq.fetch': {
						//uri: '',
						////uri: 'INBOX',
						////uri: 'INBOX/?openReadOnly=false', //readonly || openReadOnly
						////uri: '?openReadOnly=false',
						////uri: 'INBOX/?openReadOnly=false&modifiers.something=xxx',
						//opts: [//fetch params
							//'1:3',
							//{//fetch options
								////bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
								//struct: true,
								//envelope: true,
								//bodies: ['']//header + resp
							//}
						//]
					//}
				//}
			],
			periodical: [
				//{ list: { uri: '' } },
				//{ fetch: { uri: 'apache_accesses' } },
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
			search: [
				{
					path: ':mailbox?/:options?',
					callbacks: ['save']
				},
			],
			'seq.search': [
				{
					path: ':mailbox?/:options?',
					callbacks: ['save']
				},
			],
			fetch: [
				{
					path: ':mailbox?/:options?',
					callbacks: ['save']
				},
			],
			'seq.fetch': [
				{
					path: ':mailbox?/:options?',
					callbacks: ['save']
				},
			],
		},
		
  },
  //search: function(err, resp, options){
		//debug('search err %o', err);
		//debug('search %o', resp);
		//debug('search options %o', options);
	//},
	//seq_search: function(err, resp, options){
		//debug('seq_search err %o', err);
		//debug('seq_search %o', resp);
		//debug('seq_search options %o', options);
	//},
	//fetch: function(err, resp, options){
		//debug('fetch err %o', err);
		//debug('fetch %o', resp);
		//debug('fetch options %o', options);
	//},
	save: function(err, resp, options){
		
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
			
			
			if(typeof(resp) == 'array' || resp instanceof Array)
				resp = [resp];
				
			this.fireEvent(
				this[
					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
				],
				resp
			);
			
			
		}
	},
  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		this.log('imap_test', 'info', 'imap_test started');
		
		debug('initialized %o', options);
		
  },
  
	
});

