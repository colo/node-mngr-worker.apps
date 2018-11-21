'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OS:Purge:Compact');
var debug_internals = require('debug')('Server:Apps:OS:Purge:Compact:Internals');
var debug_events = require('debug')('Server:Apps:OS:Purge:Compact:Events');

module.exports = new Class({
  Extends: App,

  options: {

		id: 'os.purge.compact',

		requests : {
			periodical: [

        //marking docs as _deleted and then comnpacting is more efficient than using the delete api
				{
					compact: function(req, next, app){
						app.compact({
							uri: app.options.db,
						})
					}
				}

			],

		},

		routes: {
      compact: [
				{
					path: ':database',
					callbacks: ['compact'],
				}
			],

		},

  },

  compact: function (err, resp, options){
		debug('compact %o', resp);
		debug('compact options %o', options);

		if(err)
			debug('compact err %o', err);

	},

  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-purge-compact', 'info', 'os-purge-compact started');

  },

});
