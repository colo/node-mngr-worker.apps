'use strict'


let App = require('node-app-rethinkdb-client')

var debug = require('debug')('Server:Apps:OS:Historical:Hour:Input');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Hour:Input:Internals');
var debug_events = require('debug')('Server:Apps:OS:Historical:Hour:Input:Events');

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}


module.exports = new Class({
  Extends: App,

  hosts: [],

  blacklist_path: undefined,
  paths: [],

  periodicals: {},

  options: {

		id: 'os.historical.hour',

		requests : {
			periodical: [
        {
					search_paths: function(req, next, app){
            debug_internals('search_paths');

            // app.between({
            //   _extras: 'path',
            //   uri: app.options.db+'/historical',
            //   args: [
            //     roundMilliseconds(Date.now() - 1000),
            //     roundMilliseconds(Date.now()),
            //     {
            //       index: 'timestamp',
            //       leftBound: 'open',
            //       rightBound: 'open'
            //     }
            //   ]
            // })

            app.distinct({
              _extras: 'path',
              uri: app.options.db+'/historical',
              args: {index: 'path'}
            })

					}
				},
        {
					search_hosts: function(req, next, app){
						debug_internals('search_hosts');

            // app.between({
            //   _extras: 'host',
            //   uri: app.options.db+'/historical',
            //   args: [
            //     roundMilliseconds(Date.now() - 1000),
            //     roundMilliseconds(Date.now()),
            //     {
            //       index: 'timestamp',
            //       leftBound: 'open',
            //       rightBound: 'open'
            //     }
            //   ]
            // })
            app.distinct({
              _extras: 'host',
              uri: app.options.db+'/historical',
              args: {index: 'host'}
            })
					}
				},
        {
					get_last_stat: function(req, next, app){
						//debug_internals('_get_last_stat %o', next);
						debug_internals('_get_last_stat %o', app.hosts);

						let views = [];
						Object.each(app.hosts, function(value, host){
							debug_internals('_get_last_stat %s', host);

              Array.each(app.paths, function(path){
                debug_internals('_get_last_stat %s %s', host, path);
                let _func = function(){
                  app.between({
                    _extras: {'get_last_stat': true, host: host, path: path},
                    uri: app.options.db+'/historical',
                    args: [
                      [path, host, 'hour', roundMilliseconds(0)],
                      [path, host, 'hour', roundMilliseconds(Date.now())],
                      {
                        index: 'sort_by_path',
                        leftBound: 'open',
                        rightBound: 'open'
                      }
                    ],
                    chain: [{orderBy: { index: app.r.desc('sort_by_path') }}, {limit: 1}]
                    // orderBy: { index: app.r.desc('sort_by_path') }
                  })

                }.bind(app)


  							views.push(_func);

              })

						});

						Array.each(views, function(view){
							view();
						});
						// next(views);
					}
				},
        {
					fetch_history: function(req, next, app){
						let now = new Date();
						debug_internals('fetch_history time %s', now);

						let limit = 60;//60 docs = 1 hour of historical data

						let views = [];

						Object.each(app.hosts, function(data, host){

              Object.each(data, function(value, path){
                debug_internals('fetch_history value %s %d %s', path, value, host);

                if(value >= 0){

                    app.between({
                      _extras: {'fetch_history': true, host: host, path: path, from: value},
                      uri: app.options.db+'/historical',
                      args: [
                        [path, host, 'minute', value],
                        [path, host, 'minute', roundMilliseconds(Date.now())],
                        {
                          index: 'sort_by_path',
                          leftBound: 'open',
                          rightBound: 'open'
                        }
                      ],
                      chain: [{limit: limit}]
                    })

                }//if value
              }.bind(app))


						}.bind(app));


					}

				},



			],


		},

		routes: {
      between: [{
        path: ':database/:table',
        callbacks: ['between']
      }],
      distinct: [{
        path: ':database/:table',
        callbacks: ['distinct']
      }],



		},

  },

  distinct: function(err, resp, params){
    debug_internals('distinct', params.options)

    if(err){
      debug_internals('distinct err', err)

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

      resp.toArray(function(err, arr){
        debug_internals('distinct count', arr)


        if(params.options._extras == 'path'){
          if(arr.length == 0){
  					debug_internals('No paths yet');
  				}
  				else{

            this.paths = []

  					Array.each(arr, function(row, index){
  						// debug_internals('Path %s', row);

              if(
                (
                  !this.blacklist_path
                  || (this.blacklist_path && this.blacklist_path.test(row) == false)
                )
                && !this.paths.contains(row)
              )
                this.paths.push(row)

  					}.bind(this));

  					debug_internals('PATHs %o', this.paths);
  				}
  			}
        else if(params.options._extras == 'host'){
          if(arr.length == 0){
  					debug_internals('No hosts yet');
  				}
  				else{

  					Array.each(arr, function(row, index){
  						let host = row
              if(this.hosts[host] == undefined) this.hosts[host] = {}

  					}.bind(this));

  					debug_internals('HOSTs %o', this.hosts);
  				}
        }

      }.bind(this))


    }
  },
  between: function(err, resp, params){
    debug_internals('between', params.options)

    if(err){
      debug_internals('between err', err)

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

      resp.toArray(function(err, arr){
        debug_internals('between count', arr.length)


        // if(params.options._extras == 'path'){
        //   if(arr.length == 0){
  			// 		debug_internals('No paths yet');
  			// 	}
  			// 	else{
        //
        //     this.paths = []
        //
  			// 		Array.each(arr, function(row, index){
  			// 			// debug_internals('Path %s', row);
        //
        //       if(
        //         (
        //           !this.blacklist_path
        //           || (this.blacklist_path && this.blacklist_path.test(row.metadata['path']) == false)
        //         )
        //         && !this.paths.contains(row.metadata['path'])
        //       )
        //         this.paths.push(row.metadata['path'])
        //
  			// 		}.bind(this));
        //
  			// 		debug_internals('PATHs %o', this.paths);
  			// 	}
  			// }
        // else if(params.options._extras == 'host'){
        //   if(arr.length == 0){
  			// 		debug_internals('No hosts yet');
  			// 	}
  			// 	else{
        //
  			// 		Array.each(arr, function(row, index){
  			// 			// debug_internals('Host %s', row);
  			// 			//this.hosts.push({name: doc.key, last: null});
        //
  			// 			// if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;
        //       // if(!this.hosts.contains(row.metadata['host']))
        //       //   this.hosts.push(row.metadata['host'])
        //       let host = row.metadata['host']
        //       if(this.hosts[host] == undefined) this.hosts[host] = {}
        //
  			// 		}.bind(this));
        //
  			// 		debug_internals('HOSTs %o', this.hosts);
  			// 	}
        // }
        if(params.options._extras.get_last_stat == true){
          debug_internals('between params.options._extras.get_last_stat %o', arr)
          if(arr.length == 0){//there are no historical for this host yet
            let host = params.options._extras.host
            let path = params.options._extras.path.replace('historical.', '');

            if(!this.hosts[host]) this.hosts[host] = {}

            this.hosts[host][path] = 0;

  					debug_internals('No historical for host %o', host);
  					debug_internals('HOSTs %o', this.hosts);

          }
          else{//if there are historical already, add perdiocal starting from "end"
  					//throw new Error('there are historical already:implement');
            let host = params.options._extras.host
            let path = params.options._extras.path.replace('historical.', '');

            // let last = resp[0].doc.metadata.range.end + 1;
            let last = arr[0].metadata['timestamp'] + 1

            if(!this.hosts[host]) this.hosts[host] = {}

  					this.hosts[host][path] = last;

            debug_internals('Hosts %o', this.hosts);

  				}
        }
        else if(params.options._extras.fetch_history == true){
          // if(params.options._extras.path == 'os.procs.cmd.stats')
            debug_internals('between params.options._extras.fetch_history %d %s %d', params.options._extras.from, params.options._extras.path, arr.length)

          this.hosts = {};

  				if(params.uri != ''){
  					this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1), JSON.decode(resp));//capitalize first letter
  				}
  				else{
  					this.fireEvent('onGet', [arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);
  				}



          if(arr.length > 0){

            debug_internals('this.options.requests.current.type %s', this.options.requests.current.type)

  					this.fireEvent(
  						this[
  							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
  						],
  						[arr, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
  					);


  				}
  				else{//no docs

  				}

        }



      }.bind(this))


    }




  },


  initialize: function(options){

		this.parent(options);//override default options

		this.log('os-historical-hour', 'info', 'os-historical-hour started');

  },

});
