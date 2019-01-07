//const HOST = '127.0.0.1'
const HOST = 'elk'
const DATABASES = ['live', 'historical']
// const DATABASE = 'historical'

var path = require('path');
    //jsonfile = require('jsonfile');
    //websql = require('pouchdb/extras/websql');

var cradle = require('cradle-pouchdb-server');


// create a design doc
var ddoc = [
	{
		_id: '_design/sort',
    "language": "javascript",
		views: {
			by_date: {
				map: function (doc) {
						var date = 0;

						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}

						emit([date, doc.metadata.type, doc.metadata.host], null);
					//}
				}.toString()
			},
			by_host: {
				map: function (doc) {
						var date = 0;

						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}

						//emit([doc.metadata.type, host, date], null);
						emit([doc.metadata.host, doc.metadata.type, date], null);
					//}
				}.toString()
			},
			by_path: {
				map: function (doc) {

						var date = 0;

						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}

						//emit([doc.metadata.type, doc.metadata.path, host, date], null);
						emit([doc.metadata.path, doc.metadata.host, doc.metadata.type, date], doc._rev);
					//}
				}.toString()
			}
		}
	},
	{
		_id: '_design/search',
    "language": "javascript",
		views: {
			hosts: {
				map: function (doc) {
					emit(doc.metadata.host, null);
				}.toString(),
				reduce: function(keys, values) {
					return null;
				}.toString()
			},
			paths: {
				map: function (doc) {
					emit(doc.metadata.path, null);
				}.toString(),
				reduce: function(keys, values) {
					return null;
				}.toString()
			},
		}
	}
]

let indices = [
	{
		"index": {
			"fields": ['metadata.path', 'metadata.host', 'metadata.type', 'metadata.timestamp'],
		},
		"ddoc": 'mango_search',
		"name": 'path'
	}
]

DATABASES.forEach(function(DATABASE){
	var db = new(cradle.Connection)(HOST, 5984).database(DATABASE);
	let nano = require('nano')('http://'+HOST+':5984');
	let nano_db = nano.db.use(DATABASE);

	indices.forEach(function(index){
		nano_db.createIndex(index).then((result) => {
		  console.log(result);
		});
	})


	var save_views = function(){
		db.save(ddoc, function (err, res) {
			if(err){
				console.log('BULK SAVE ERR');
				console.log(err);
			}
			else{
				console.log('BULK SAVE RESP');
				console.log(res);
			}
		});
	};

	db.exists(function (err, exists) {
		if (err) {
			console.log('error', err);
		}
		else {
			if(!exists){
				db.create(function(err){
					if(!err){
						save_views();
					}
				});

			}
			else{
				save_views();
			}

		}
	}.bind(this));


})

// save the design doc
//db.bulkDocs([ddoc, ddoc_status]).catch(function (err) {
  //if (err.name !== 'conflict') {
    //throw err;
  //}
  //// ignore if doc already exists
//}).then(function () {


	//return db.query('status/by_path_host', {
		//startkey: ["os.blockdevices", "localhost.colo\ufff0", 1470277762363],
		//endkey: ["os.blockdevices", "localhost.colo", 1470277760000],
		//limit: 1,
		//descending: true,
		//inclusive_end: true,
		////include_docs: true
	//});

  ////return db.query('info/by_path_host', {
		////startkey: ["os", "localhost.colo\ufff0"],
		////endkey: ["os", "localhost.colo"],
		////limit: 1,
		////descending: true,
		////inclusive_end: true,
		//////include_docs: true
  ////});

	////return db.query('info/by_date', {
		////startkey: [1469675114071, "localhost.server", "os"],
		////endkey: [1469675114071, "localhost.server\ufff0", "os.mounts\ufff0"],
		//////inclusive_end: true
		////include_docs: true
  ////});

	////return db.query('os/by_date', {
		//////startkey: [1469639314750, "com.example.server"],
		//////endkey: [99999999999999, "com.example.server"],
		//////inclusive_end: true
  ////});

  ////return db.query('os/by_host', {
		////startkey: "1469584391932",
		////endkey: "1469586311057",
		//////inclusive_end: true
  ////});

  ////return db.query('os/info', {
		////startkey     : ["", [2015,7,27,14,8,34]],
		////endkey       : [{}, "\uffff"],
  ////});
  ///**
   //* all from one host
   //*
   //* */
  ////return db.query('os/info', {
		////startkey     : ['localhost.colo'],
		////endkey       : ['localhost.colo\uffff'],
  ////});
  ///** OR */
  ////return db.query('os/info', {
		////startkey     : ['localhost.colo'],
		////endkey       : ['localhost.colo', {}],
  ////});

  ///**
   //* last from one host (reverse star & end keys)
   //*
   //* */
  ////return db.query('os/info', {
		////startkey     : ['localhost.colo\uffff'],
		////endkey       : ['localhost.colo'],
		////limit: 1,
		////descending: true
  ////});

  ///**
   //* one host - range from date
   //*
   //* */
	////return db.query('os/info', {
		////startkey     : ["localhost.colo",[2016,7,27,14,8,0]],
		////endkey       : ["localhost.colo",[2016,7,27,14,8,34]],
		//////inclusive_end: true
    //////include_docs: true
  ////});


  ///**
   //* all from one domain
   //*
   //* */
  ////return db.query('os/info', {
		////startkey     : ['localhost'],
		////endkey       : ['localhost\uffff'],
  ////});

  ///**
   //* one domain - range from date
   //*
   //* */
	////return db.query('os/info', {
		////startkey     : ["localhost",[2016,7,27,14,8,34]],
		////endkey       : ["localhost\uffff",[2016,7,27,14,8, 0]],
		//////inclusive_end: true
    //////include_docs: true
  ////});

  ///**
   //* all domains - range from date
   //*
   //* */
	////return db.query('os/info', {
		////startkey     : ["",[2016,7,26,0,0,0]],
		////endkey       : ["\uffff",[2016,7,27,23,59,59]],
		//////inclusive_end: true
    //////include_docs: true
  ////});

//}).then(function (result) {

	////console.log(result);
	////result.rows.forEach(function(row){
		////delete row.doc._rev;
		////jsonfile.writeFileSync(path.join(__dirname,'./test/info/',row.doc._id), row.doc);
		//////console.log(row.doc);
	////});

  //result.rows.forEach(function(row){
		//console.log(row.key);
		//console.log(row.doc);
	//});
//}).catch(function (err) {
  //console.log(err);
//});
