'use strict'

var App = require('node-app-munin-client');

var debug = require('debug')('Server:Apps:Munin');

module.exports = new Class({
  Extends: App,
  
  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',
  
  options: {
		
		requests : {
			periodical: [
				//{ list: { uri: '' } },
				//{ fetch: { uri: 'apache_accesses' } },
				//{ fetch: { uri: 'if_eth0' } },
				//{ config: { uri: 'if_eth0' } },
				//{ nodes: { uri: '' } },
				{ quit: { uri: '' } },
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
			nodes: [
				{
					path: '',
					callbacks: ['nodes']

				},
			],
			quit: [
				{
					path: '',
					callbacks: ['quit']

				},
			],
			config: [
				{
					path: ':module',
					callbacks: ['config']

				},
			],
		},
		
  },
  
	fetch: function (err, resp, options){
		debug('fetch %o', resp);
		debug('fetch options %o', options);
	},
	list: function (err, resp, options){
		debug('list %o', resp);
		debug('list options %o', options);
	},
	nodes: function (err, resp, options){
		debug('nodes %o', resp);
		debug('nodes options %o', options);
	},
	quit: function (err, resp, options){
		debug('quit %o', resp);
		debug('quit options %o', options);
	},
	config: function (err, resp, options){
		debug('config err %o', err);
		debug('config %o', resp);
		debug('config options %o', options);
	},
  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		this.log('munin_test', 'info', 'munin_test started');
		
		debug('initialized %o', options);
		
  },
  
	
});

