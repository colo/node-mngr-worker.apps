/* eslint-disable */

'use strict'

// const App = require ( '../../node_modules/node-app-couchdb-client/index' )
const App = require ( 'node-app-socket.io-client/index' )

const Debug = require('debug')

const debug = Debug("Server:Apps:Logs:Nginx:Input:IO")
const debug_internals = Debug("Server:Apps:Logs:Nginx:Input:IO:Internals")
// debug_events = Debug("Server:Apps:Logs:Nginx:Input:IO:Events");

// import store from 'src/store'

// import DefaultConn from '@etc/default.io'
// import HostsIO from '@etc/hosts.io'

module.exports = new Class({
  Extends: App,

  // ON_SUSPEND: 'onSuspend',
	// ON_RESUME: 'onResume',
	// ON_EXIT: 'onExit',
  //
	// ON_ONCE: 'onOnce',
	// ON_RANGE: 'onRange',
  //
	// ON_DOC: 'onDoc',
	// ON_DOC_ERROR: 'onDocError',
  //
	// ON_ONCE_DOC: 'onOnceDoc',
	// ON_ONCE_DOC_ERROR: 'onOnceDocError',
  //
	// ON_PERIODICAL_DOC: 'onPeriodicalDoc',
	// ON_PERIODICAL_DOC_ERROR: 'onPeriodicalDocError',

  // types: ['count', 'hosts', 'paths'],
  // recived: [],

  lines_counter: 0,

  options: {
    // path: '/hosts',

    scheme: undefined,
    host: undefined,
    port: undefined,


  	requests : {
      /**
      * if there is at least one function (once|periodical) it won't fireEvents
      **/
      once: [
        {
          test: function(){
            debug('starting...')
          }
        }

			],
			periodical: [
        // {
        //   test: function(){
        //     debug('test')
        //   }
        // }

			],

		},

    io: {
			middlewares: [], //namespace.use(fn)
			// rooms: ['hosts'], //atomatically join connected sockets to this rooms
			routes: {
				// 'app.doc': [{
				// 	// path: ':param',
				// 	// once: true, //socket.once
				// 	callbacks: ['app_doc'],
				// 	// middlewares: [], //socket.use(fn)
				// }],
        'line': [{
					// path: ':param',
					// once: true, //socket.once
					callbacks: ['line'],
					// middlewares: [], //socket.use(fn)
				}],
        // 'on': [{
				// 	// path: ':param',
				// 	// once: true, //socket.once
				// 	callbacks: ['register'],
				// 	// middlewares: [], //socket.use(fn)
				// }],
				// '*': [{// catch all
				// 	path: '',
				// 	callbacks: ['not_found_message'],
				// 	middlewares: [], //socket.use(fn)
				// }]
			}
		}


  },

  // register: function(socket, next, result){
  //   debug('register %o', result)
  //
  // },
  // hosts: function(socket, next, doc){
  //   debug('hosts %o', doc)
  //   let {type} = doc
  //
  //   this.fireEvent('onDoc', [doc, { type: type, input_type: this, app: null }])
  //
  //   // store.commit('hosts/clear')
  //   // store.commit('hosts/set', doc[type])
  // },


  line: function(socket, next, line){
    debug('line %s', line)

    this.lines_counter++

    this.fireEvent(
      this.ON_DOC,
      [
        {
          'log' : line,
          'domain': this.options.domain,
          'counter': this.lines_counter,
          'input': 'frontail'
        },
        {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}
      ]
    )

    // let {type} = doc

    // this.fireEvent('onDoc', [doc, { type: type, input_type: this, app: null }])

    // store.commit('hosts/clear')
    // store.commit('hosts/set', doc[type])
  },
  initialize: function(options){
    debug('initialize', options)

    // this.addEvent('onDocSaved', function(err, result){
    //   debug('DOC SAVED', err, result)
    //
    //
    // }.bind(this))

		this.parent(options);//override default options
    //
    // // let _io = new App(DefaultConn)
    // this.add_io(HostsIO)

		this.profile('root_init');//start profiling



    // this.addEvent('onConnect', function(){
    //   debug('initialize socket.onConnect', this.io.id)
    //   // this.io.emit('on', 'hosts')
    //   // this.io.emit('/')
    //
    // }.bind(this))
    //
    // this.addEvent('onExit', function(){
    //   debug('onExit')
    //
    //   this.io.on('off', 'hosts')
    //
    //   this.remove_io_routes()
    //
    //   // if(this.io.disconnected == false)
    //   //   this.io.close()
    // }.bind(this))

		this.profile('root_init');//end profiling

		this.log('root', 'info', 'root started');
  },

});
