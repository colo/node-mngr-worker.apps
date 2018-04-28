var path = require('path');

var cradle = require('cradle-pouchdb-server');
		

		
// create a design doc
var ddoc = [
	{
		_id: '_design/sort',
		views: {
			by_date: {
				map: function (doc) {
					
					if (doc.metadata.path == 'os.stats') {
						var date = 0;
						
						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}
						

						emit([date, doc.metadata.host], null);
					}
					
				}.toString()
			},
			by_host: {
				map: function (doc) {
					
					if (doc.metadata.path == 'os.stats') {
						var date = 0;
						
						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}
						

						emit([doc.metadata.host, date], null);
					}
					
				}.toString(),
				//reduce: function(keys, values) {
					//return null;
				//}.toString()
			},
			by_type: {
				map: function (doc) {
					
					if (doc.metadata.path == 'os.stats') {
						var date = 0;
						
						if(!doc.metadata.timestamp){
							var id = doc._id.split('@');//get host.path | timestamp
							date = parseInt(id[1]);
						}
						else{
							date = parseInt(doc.metadata.timestamp);
						}
						

						emit([doc.metadata.type, doc.metadata.host, date], null);
					}
					
				}.toString(),
				//reduce: function(keys, values) {
					//return null;
				//}.toString()
			},
			by_path: {
				map: function (doc) {
					if (doc.metadata.path == 'os.stats') {
						
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
						
					}

				}.toString()
			}
		}
	},
	{
		_id: '_design/search',
		views: {
			hosts: {
				map: function (doc) {
					if (doc.metadata.path == 'os.stats') {
						emit(doc.metadata.host, null);
					}
				}.toString(),
				reduce: function(keys, values) {
					return null;
				}.toString()
			},
			
		}
	}
]

let host = '192.168.0.40';
//let host = '192.168.0.180';
//let host = '127.0.0.1';

var db = new(cradle.Connection)(host, 5984).database('stats');

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
		
