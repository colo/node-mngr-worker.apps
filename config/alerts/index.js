'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:Config:Alerts');
var debug_internals = require('debug')('Server:Apps:Config:Alerts:Internals');
var debug_events = require('debug')('Server:Apps:Config:Alerts:Events');

module.exports = new Class({
  Extends: App,

  hosts: {},

  periodicals: {},

  options: {

		id: 'config.alerts',

		requests : {
      once: [
        // {
				// 	view: function(req, next, app){
				// 		// debug_internals('search_hosts', app.options);
				// 		next({
				// 			uri: app.options.db,
				// 			id: 'search/paths',
				// 			data: {
				// 				reduce: true, //avoid geting duplicate paths
				// 				group: true,
				// 				inclusive_end: true,
				// 			}
				// 		})
				// 	}
				// },
        {
					view: function(req, next, app){
						// debug_internals('_get_last_stat %o', next);
						// debug_internals('_get_last_stat %o', app.hosts);

						let views = [];
						// Object.each(app.hosts, function(value, host){
							// debug_internals('_get_last_stat %s', host);

							let cb = next.pass(
								app.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
									// uri: 'historical',
                  uri: app.options.db,
									id: 'sort/by_path',
									data: {
										// startkey: ["minute", host, Date.now()],
										// endkey: ["minute", host, 0],
                    startkey: ["config", "alerts", "once\ufff0"],
                    endkey: ["config", "alerts", "once"],
                    // key: ["os", "colo", "once\ufff0"],
										limit: 1,
										descending: true,
										inclusive_end: true,
										include_docs: true
									}
								})
							);

							views.push(cb);


						// });

						Array.each(views, function(view){
							view.attempt();
						});
						next(views);
					}
				}
      ],
			periodical: [],


		},

		routes: {
			view: [
				{
					path: ':database',
					callbacks: ['search'],
					//version: '',
				},

			]
		},

  },


	search: function (err, resp, info){

		debug('search %o', resp);
		debug('search info %o', info);

		if(err){
			debug('search err %o', err);


			if(info.uri != ''){
				this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1)+'Error', err);//capitalize first letter
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

      // if(req.uri != ''){
			// 	this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), JSON.decode(body));//capitalize first letter
			// }
			// else{
			// 	this.fireEvent('onGet', JSON.decode(body));
			// }

			//this.fireEvent(this.ON_DOC, JSON.decode(body));

			if(this.options.requests.current.type == 'once'){
				this.fireEvent(this.ON_ONCE_DOC, resp);
			}
			else{
				this.fireEvent(this.ON_PERIODICAL_DOC, resp);
			}

		}

	},

  initialize: function(options){

		this.parent(options);//override default options

		this.log('config-alerts', 'info', 'config-alerts started');

  },

});
