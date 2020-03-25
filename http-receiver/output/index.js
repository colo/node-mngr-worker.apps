'use strict'

const debug = require('debug')('Server:Apps:HttpReceiver:Output'),
      debug_internals = require('debug')('Server:Apps:HttpReceiver:Output:Internals'),
      debug_events = require('debug')('Server:Apps:HttpReceiver:Output:Events')

// const	mootools = require('mootools')
// let HttpClient = require('js-pipeline.input.httpclient')
let conn = []

let HttpClient = require('node-app-http-client');

let HttpClientReceiver = new Class({
  Extends: HttpClient,

  options: {

		// requests : {
		// 	// once: [
		// 	// 	{ api: { get: {uri: ''} } },
		// 	// ],
		// 	periodical: [
		// 		{ api: { get: {uri: ''} } },
		// 	],
    //
		// },

		routes: {
		},

		api: {

			version: '1.0.0',

			routes: {
        post: [
					{
						path: ':prop',
						callbacks: ['post'],
						//version: '',
					},
				],
				get: [
					{
						path: '',
						callbacks: ['get'],
						//version: '',
					}
				]
			},

		},
  },

  post: function (err, resp, body, req){
    debug('HttpClientReceiver post %o', resp.statusCode)
    if(resp.statusCode !== 200)
      conn[index].accept = false
      // process.exit(1)

  },
  get: function (err, resp, body, req){
    let index = req.options.qs.index

    if(!conn[index]) conn[index] = {}

    if(resp && resp.statusCode === 200){
      conn[index].accept = true
      // this.fireEvent(this.ON_ACCEPT, index)
    }
    else{
      conn[index].accept = false
    }

    debug('HttpClientReceiver get %o', conn, resp)
    // process.exit(1)
  }
})

/**
 *
 * */
module.exports = new Class({
  Implements: [Options, Events],
  // Extends: HttpClient,

  // dbs: [],
  accept: false,
  conns: [],
  buffer: [],
  buffer_expire: 0,

  ON_CONNECT: 'onConnect',
  ON_CONNECT_ERROR: 'onConnectError',
  ON_ACCEPT: 'onAccept',

  ON_DOC: 'onDoc',
	//ON_DOC_ERROR: 'onDocError',

	ON_ONCE_DOC: 'onOnceDoc',
	//ON_ONCE_DOC_ERROR: 'onOnceDocError',

	ON_PERIODICAL_DOC: 'onPeriodicalDoc',
  //ON_PERIODICAL_DOC_ERROR: 'onPeriodicalDocError',

  ON_SAVE_DOC: 'onSaveDoc',
  ON_SAVE_MULTIPLE_DOCS: 'onSaveMultipleDocs',

  ON_DOC_SAVED: 'onDocSaved',

  options: {
		id: null,
		conn: [
			{
        host: '127.0.0.1',
				port: 9080,
        http:{},
				// db: undefined,
        // table: undefined,
        // rethinkdb: {
    		// 	// 'user': undefined, //the user account to connect as (default admin).
    		// 	// 'password': undefined, // the password for the user account to connect as (default '', empty).
    		// 	// 'timeout': undefined, //timeout period in seconds for the connection to be opened (default 20).
    		// 	// /**
    		// 	// *  a hash of options to support SSL connections (default null).
    		// 	// * Currently, there is only one option available,
    		// 	// * and if the ssl option is specified, this key is required:
    		// 	// * ca: a list of Node.js Buffer objects containing SSL CA certificates.
    		// 	// **/
    		// 	// 'ssl': undefined,
    		// },
			},
		],

		buffer:{
      size: 5,//-1 =will add until expire | 0 = no buffer | N > 0 = limit buffer no more than N
			expire: 5000, //miliseconds until saving
			periodical: 1000 //how often will check if buffer timestamp has expire
		},

    // insert: {durability: 'soft', returnChanges: false, conflict: 'replace'},
	},
  connect(err, conn, params){
		debug_events('connect %o', err, conn)
    // process.exit(1)
    let {index} = params

		if(err){
			this.fireEvent(this.ON_CONNECT_ERROR, { error: err, params: params });
			// throw err
		}
		else {
			// this.conn = conn
			this.fireEvent(this.ON_CONNECT, { conn: conn,  params: params});

      // this.conns[index].accept = true
      // this.options.conn[index].accept = true

      // try{
      //   let index = params.index
      //   let db = this.options.conn[index].db
      //   let table = this.options.conn[index].table
      //
      //   this.r.dbList().run(conn, function(err, dbs){
      //     debug_internals('connect-> setting dbs %o %s', dbs, db);
      //     let exist = false
      //     Array.each(dbs, function(d){
      //       if(d == db)
      //         exist = true
      //     })
      //
      //     if(exist === false){
      //       debug_internals('connect-> setting db/table %o', this.options.conn[index]);
      //       this.r.dbCreate(db).run(conn, function(err, result){
      //         // this._save_docs(doc, index);
      //         try{
      //           this.r.db(db).tableCreate(table).run(conn, function(err, result){
      //             debug_internals('connect-> setting db/table %o create', err, result);
      //             this.options.conn[index].accept = true
      //
      //             this.fireEvent(this.ON_ACCEPT)
      //           }.bind(this))
      //         }
      //         catch(e){
      //           // this._save_docs(doc, index);
      //           debug_internals('tableCreate error %o', e);
      //         }
      //       }.bind(this));
      //     }
      //     else {
      //       this.options.conn[index].accept = true
      //
      //       this.fireEvent(this.ON_ACCEPT)
      //     }
      //   }.bind(this))
      //
      //
      // }
      // catch(e){
      //   // console.log(e)
      //   debug_internals('dbCreate error %o', err);
      //   // this._save_docs(doc, index);
      // }
		}
	},
  __connect: function(connect_index, connect_cb){
    Array.each(this.options.conn, function(conn, index){
      if(!connect_index || connect_index === undefined || connect_index === index){
        // this.dbs.push( new(couchdb.Connection)(conn.host, conn.port, conn.opts).database(conn.db) );

        // let opts = {
    		// 	host: conn.host,
    		// 	port: conn.port,
    		// 	// db: conn.db
    		// };

        let _cb = function(err, conn){
          this.conns[index] = conn
          connect_cb = (typeOf(connect_cb) ==  "function") ? connect_cb.bind(this) : this.connect.bind(this)
          connect_cb(err, conn, Object.merge(Object.clone(conn), {index: index}))
        }.bind(this)

        // this.r = require('rethinkdb')
        //
    		// this.r.connect(Object.merge(opts, conn.rethinkdb), _cb)

        // let httpconn = new HttpClientReceiver(Object.merge(opts, conn.http))
        let httpconn = new HttpClientReceiver(Object.merge(Object.clone(conn), {path: ''}))
        httpconn.addEvent(httpconn.ON_CONNECT, function(payload){_cb(undefined, httpconn, payload)})
        httpconn.addEvent(httpconn.ON_CONNECT_ERROR, function(payload){_cb(payload, httpconn, undefined)})

        debug('INITIALIZE %o', httpconn, conn)
        // process.exit(1)
        httpconn.api.get({
          uri:'',
          qs: {
            index: index
          },
          gzip: true
        })
        // process.exit(1)

      }

		}.bind(this));
  },
	initialize: function(options, connect_cb){
		//console.log('---RethinkDBOutput->init---');
		//throw new Error();
    debug('INITIALIZE %o', options)
    // process.exit(1)

		this.setOptions(options);

		if(typeOf(this.options.conn) != 'array'){
			var conn = this.options.conn;
			this.options.conn = [];
			this.options.conn.push(conn);
		}

		this.__connect(undefined, connect_cb)



		this.addEvent(this.ON_SAVE_DOC, function(doc){
			debug_events('this.ON_SAVE_DOC %o', doc);

			this.save(doc);
		}.bind(this));

		this.addEvent(this.ON_SAVE_MULTIPLE_DOCS, function(docs){
			debug_events('this.ON_SAVE_MULTIPLE_DOCS %o', docs);

			this.save(docs);
		}.bind(this));

		this.buffer_expire = Date.now() + this.options.buffer.expire;
		this._expire_buffer.periodical(this.options.buffer.periodical, this);

	},
	save: function(doc){
		debug_internals('save %o', doc);

		if(this.options.buffer.size == 0){

			this._save_to_dbs(doc)
		}
		// else if( this.buffer.length < this.options.buffer.size && this.buffer_expire > Date.now()){
		// 	this.buffer.push(doc);
		// }
		else{
      if((typeof(doc) == 'array' || doc instanceof Array || Array.isArray(doc)) && doc.length > 0){
        Array.each(doc, function(d){
          this.buffer.push(d)
          if(this.options.buffer.size > 0 && this.buffer.length >= this.options.buffer.size){
            this._save_buffer()
          }
        }.bind(this))
      }
      else{
  			this.buffer.push(doc)
      }


		}
	},
  _save_to_dbs: function(doc){

    Array.each(this.conns, function(http_conn, index){
      debug_internals('_save_to_dbs %o %o', http_conn, this.options.conn[index])
      // // let table = this.options.conn[index].table
      // let db = this.options.conn[index].db
      // let table = this.options.conn[index].table
      let accept = (conn[index] && conn[index].accept) ? conn[index].accept : false
      //
      debug_internals('_save_to_dbs %d %o %o', index, conn, accept)
      // process.exit(1)

      if(accept === true){
        this._save_docs(doc, index);
      }
      else {
        this.__connect(index)
      }
      // else{
      //   let _save = function(index){
      //     this._save_docs(doc, index);
      //     this.removeEvent(this.ON_ACCEPT, _save)
      //   }.bind(this)
      //   this.addEvent(this.ON_ACCEPT, _save)
      // }





    }.bind(this));
  },
	_save_docs: function(doc, index){
		debug_internals('_save_docs %o %s %o', doc, index, this.options.insert);

    // let db = this.options.conn[index].db
    // let table = this.options.conn[index].table
    let conn = this.conns[index]
    let path = this.options.conn[index].path

    conn.api.post({
      uri: path,
      body: doc,
      json: true,
      gzip: true
    })

    // this.r.db(db).table(table).insert(doc, this.options.insert).run(conn, function(err, result){
    //   debug_internals('insert result %o', err, result);
    //   this.fireEvent(this.ON_DOC_SAVED, [err, result])
    // }.bind(this))
      // this.r.db(db).tableList().run(conn, function(tables){
      //
      //   let exist = false
      //
      //   console.log(db, table, tables, exist)
      //
      //   Array.each(tables, function(t){
      //     if(t == table)
      //       exist = true
      //   }.bind(this))
      //
      //
      //
      //   if(exist === false){
      //     try{
      //       this.r.db(db).tableCreate(table).run(conn, function(result){
      //         this.r.db(db).table(table).insert(doc).run(conn, function(result){
      //           // debug_internals('insert result %o', result);
      //         })
      //       }.bind(this))
      //     }
      //     catch(e){
      //       this.r.db(db).table(table).insert(doc).run(conn, function(result){
      //         // debug_internals('insert result %o', result);
      //       })
      //       debug_internals('tableCreate error %o', e);
      //     }
      //   }
      // }.bind(this))




    // if((typeof(doc) == 'array' || doc instanceof Array || Array.isArray(doc)) && doc.length > 0){
    //   try{
    //     db = this.conns[index].use(db)
    //     db.bulk({docs: doc }, (err, data, headers) => {
    //       if(err)
    //         debug_internals('db.bulk err %o', err)
    //     })
    //   }
    //   catch(e){
    //     console.log(e)
    //   }
    //
    // }
    // else{
    //   try{
    //     db = this.conns[db].use(db)
    //     db.insert(doc, (err, data, headers) => {
    //       if(err)
    //         debug_internals('db.insert err %o', err)
    //     })
    //   }
    //   catch(e){
    //     console.log(e)
    //   }
    // }

	},
  _expire_buffer: function(){
		if(this.buffer_expire <= Date.now() && this.buffer.length > 0){
      debug_internals('_expire_buffer %o', this.buffer_expire);
			this._save_buffer()
		}

	},
	_save_buffer: function(){
		// if(this.buffer_expire <= Date.now() && this.buffer.length > 0){
      // debug_internals('_save_buffer %o', this.buffer);
			// let doc = this.buffer;
			// this._save_docs(Array.clone(this.buffer));

      // if(this.accept === true){
        this._save_to_dbs(Array.clone(this.buffer));
  			this.buffer = [];
  			this.buffer_expire = Date.now() + this.options.buffer.expire;
      // }

			// debug_internals('_save_buffer %o', doc);
		// }

	}
});
