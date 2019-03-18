'use strict'

var App = require('node-app-cradle-client');

var debug = require('debug')('Server:Apps:OSHourHistorical');
var debug_internals = require('debug')('Server:Apps:OSHourHistorical:Internals');
var debug_events = require('debug')('Server:Apps:OSHourHistorical:Events');



module.exports = new Class({
  Extends: App,

  hosts: {},

  periodicals: {},

  options: {

		id: 'os.historical',

		requests : {

			periodical: [
				{
					view: function(req, next, app){
						debug_internals('search_hosts');
						next({
							uri: app.options.db,
							id: 'search/hosts',
							data: {
								reduce: true, //avoid geting duplicate host
								group: true,
								inclusive_end: true,
							}
						})
					}
				},
				{
					view: function(req, next, app){
						let now = new Date();
						debug_internals('fetch_history time %s', now);

						let limit = 60;//60 docs = 1 hour of historical data

						let views = [];

						Object.each(app.hosts, function(value, host){
							debug_internals('fetch_history value %d', value);
							//console.log(value);

							if(value >= 0){

								debug_internals('fetch_history %s', host);

								let cb = next.pass(
									app.view({
										uri: app.options.db,
										// id: 'sort/by_type',
										id: 'sort/by_path',
										data: {
											startkey: ["os.historical", host, "minute", value],
											endkey: ["os.historical", host, "minute", Date.now()],
											limit: limit,
											//limit: 60, //60 docs = 1 minute of docs
											inclusive_end: true,
											include_docs: true
										}
									})
								);

								views.push(cb);

							}
						}.bind(app));

						Array.each(views, function(view){
							view.attempt();
						});

						//next(views);
						//app.hosts = {};
					}

				},
				{
					view: function(req, next, app){
						//debug_internals('_get_last_stat %o', next);
						debug_internals('_get_last_stat %o', app.hosts);

						let views = [];
						Object.each(app.hosts, function(value, host){
							debug_internals('_get_last_stat %s', host);

							let cb = next.pass(
								app.view({//get doc by host->last.timestamp (descending = true, and reversed star/end keys)
									uri: app.options.db,
									id: 'sort/by_path',
									data: {
										// startkey: ["hour", host, Date.now()],
										// endkey: ["hour", host, 0],
										startkey: ["os.historical", host, "hour", Date.now()],
										endkey: ["os.historical", host, "hour", 0],
										limit: 1,
										descending: true,
										inclusive_end: true,
										include_docs: true
									}
								})
							);

							views.push(cb);


						});

						Array.each(views, function(view){
							view.attempt();
						});
						//next(views);
					}
				}
			],


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

			//if(info.options.data.reduce == true && info.options.data.include_docs != true){
			if(info.uri == this.options.db && info.options.id == 'search/hosts'){//comes from search/hosts
				//this.hosts = {};

				if(Object.getLength(resp) == 0){//there are no docs.metadata.host yet
					//this._add_periodical(host, 0, Date.now());
					//throw new Error('No hosts yet: implement');
					debug_internals('No hosts yet');
				}
				else{
					//Array.each(resp, function(doc){
						//debug_internals('Historical search doc %o', doc);
						////this.hosts.push(doc.key);
						//this._get_last_stat(doc.key);//doc.key == host
					//}.bind(this));
					Array.each(resp, function(doc){
						debug_internals('Host %s', doc.key);
						//this.hosts.push({name: doc.key, last: null});

						if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;

					}.bind(this));

					debug_internals('HOSTs %o', this.hosts);
				}
			}
			// else if(info.uri == 'historical' && info.options.id == 'sort/by_type' && info.options.data.startkey[0] == 'hour'){//_get_last_stat
			else if(
				info.options.id == 'sort/by_path'
				&& info.options.data.startkey[0] == "os.historical"
				&& info.options.data.startkey[2] == 'hour'
			){//_get_last_stat
				//this.options.requests.periodical = [];

				//console.log(Object.getLength(resp));
				if(Object.getLength(resp) == 0){//there are no historical for this host yet
					let host = info.options.data.startkey[1];
					this.hosts[host] = 0;

					debug_internals('No historical for host %o', host);
					debug_internals('HOSTs %o', this.hosts);
					//this._add_periodical(info.options.data.startkey[0], 0, Date.now());

				}
				else{//if there are historical already, add perdiocal starting from "end"
					//throw new Error('there are historical already:implement');
					let host = resp[0].doc.metadata.host;
					let last = resp[0].doc.metadata.range.end + 1;

					this.hosts[host] = last;
					debug_internals('Hosts %o', this.hosts);

					/**
					 * now that we have the last historical doc for this host,
					 * we can build our "perdiodical" requests
					 * */
					//if(this.periodicals[host] != undefined){
						//let prev = this.periodicals[host];
						//delete this.options.requests.periodical[prev];
						//debug_internals("delete %s from index %d", host, prev);
						//this.fireEvent('onPeriodicalRequestsUpdated');
					//}

					//this._add_periodical(host, last, Date.now());
				}

			}
			else{//from periodical views

				debug_internals('minute historical %o', resp);
				debug_internals('minute historical %o',  Array.isArray(resp));

				this.hosts = {};

				if(info.uri != ''){
					this.fireEvent('on'+info.uri.charAt(0).toUpperCase() + info.uri.slice(1), JSON.decode(resp));//capitalize first letter
				}
				else{
					this.fireEvent('onGet', resp);
				}

				//let to_remove = [];

				if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp)){
					//Array.each(resp, function(doc){
						//to_remove.push({id: doc.doc._id, rev: doc.doc._rev});
					//});

					resp = [resp];

					this.fireEvent(
						this[
							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
						],
						resp
					);


				}
				else{//no docs
					//to_remove.push({id: resp.doc._id, rev: resp.doc._rev});
				}

			}
		}

	},

  initialize: function(options){


		this.parent(options);//override default options

		this.log('os-hour-historical', 'info', 'os-hour-historical started');

  },

});