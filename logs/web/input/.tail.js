/* eslint-disable */
'use strict'

// const App = require ( '../../node_modules/node-app-couchdb-client/index' )
const App = require ( 'node-app/index' )

// const fs = require('fs')
// const es = require('event-stream')

const Debug = require('debug')

const debug = Debug("Server:Apps:Logs:Nginx:Input:Tail")
const debug_internals = Debug("Server:Apps:Logs:Nginx:Input:Tail:Internals")

const tail = require('frontail/lib/tail')
// debug_events = Debug("Server:Apps:Logs:Nginx:Input:Tail:Events");

// import store from 'src/store'

// import DefaultConn from '@etc/default.io'
// import HostsIO from '@etc/hosts.io'

module.exports = new Class({
  Extends: App,

  ON_CONNECT: 'onConnect',
  ON_CONNECT_ERROR: 'onConnectError',

  ON_SUSPEND: 'onSuspend',
	ON_RESUME: 'onResume',
	ON_EXIT: 'onExit',

	ON_ONCE: 'onOnce',
	ON_RANGE: 'onRange',

	ON_DOC: 'onDoc',
	ON_DOC_ERROR: 'onDocError',

	ON_ONCE_DOC: 'onOnceDoc',
	ON_ONCE_DOC_ERROR: 'onOnceDocError',

	ON_PERIODICAL_DOC: 'onPeriodicalDoc',
	ON_PERIODICAL_DOC_ERROR: 'onPeriodicalDocError',

  ON_DOC_SAVED: 'onDocSaved',

  // types: ['count', 'hosts', 'paths'],
  // recived: [],
  // stream: undefined,
  tail : undefined,
  lines_counter: 0,

  MAX_LINES: 1,

  options: {
    file: undefined,
    // path: '/hosts',

    // scheme: undefined,
    // host: undefined,
    // port: undefined,


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


  },


  line: function(line){
    debug('line %s', line)

    this.lines_counter++

    // if(this.lines_counter > 0 && (this.lines_counter % this.MAX_LINES) === 0)
    //   this.stream.pause()

    this.fireEvent(
      this.ON_DOC,
      [
        {
          'log' : line,
          'domain': this.options.domain,
          'counter':this.lines_counter,
          'input': 'stdin'
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
    //   // this.lines_counter = 0
    //   this.stream.resume()
    // }.bind(this))

    this.fireEvent(this.ON_CONNECT)

		this.parent(options);//override default options

    // if (process.argv.length > 2) {
    //   this.stream = fs.createReadStream(process.argv[2])
    // }
    // else {
    //   this.stream = process.stdin
    // }
    //
    // this.stream.pipe(es.split())
    // .pipe(
    //   es.map((line) => this.line(line))
    //   .on('error', function(err){
    //     console.log('Error while reading file.', err);
    //   })
    //   .on('end', function(){
    //     // this.fireEvent('onResume')//will propagate resume until frontail.io resumes (started suspended)
    //     console.log('Read entire file.')
    //   })
    // )
    this.tailer = tail([this.options.file], {
      buffer: 1
    });

    /**
    * Send incoming data
    */
    this.tailer.on('line', this.line.bind(this));

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
