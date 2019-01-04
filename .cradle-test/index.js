'use strict'

var App = require('node-app-cradle-client'),
		difflib = require('difflib'), //https://www.npmjs.com/package/difflib#Differ
		sizeof = require('object-sizeof'),
		jdelta = require("json-delta"); //https://www.npmjs.com/package/json-delta

module.exports = new Class({
  Extends: App,
  
  //ON_CONNECT: 'onConnect',
  //ON_CONNECT_ERROR: 'onConnectError',
  
  options: {
		
		requests : {
			once: [
				{ info: {uri: 'dashboard'} },
				//{ info: 
					//function(req, next){
						////console.log('--PRE FUNCTION---')
						////console.log(req.opt);
						//next({uri: 'dashboard'});
					//}
				//},
				////{ get: {uri: 'dashboard/cache', id: 'localhost.colo.os.blockdevices@1515636560970'} },
			],
			range: [
				//{ get: {uri: 'dashboard/cache', doc: 'localhost.colo.os.blockdevices@1515636560970'} },
				{
					view: function(req, next){
						//console.log('--PRE FUNCTION---')
						//console.log(req.opt);
						next(
							{
								uri: 'dashboard',
								id: 'periodical/by_path_host',
								data: {
									//endkey: ["os", "localhost.colo\ufff0"],
									//startkey: ["os", "localhost.colo"],
									endkey: ["os", "localhost.colo", req.opt.range.end],
									startkey: ["os", "localhost.colo", req.opt.range.start],
									//descending: true,
									//limit: 2,
									inclusive_end: true,
									include_docs: true
								}
							}
							//{
								//uri: 'dashboard',
								//id: 'periodical/by_date',
								//data: {
									//endkey: [req.opt.range.end, "localhost.colo"],
									//startkey: [req.opt.range.start, "localhost.colo"],
									////descending: true,
									////limit: 2,
									//inclusive_end: true,
									//include_docs: true
								//}
							//}
						);
					}
				},
				
			],
			
		},
		
		routes: {
			compact: [
				{
					path: ':database',
					//version: '',
				},
			],
			save: [
				{
					path: ':database',
					//version: '',
				},
			],
			info: [
				{
					path: ':database',
					callbacks: ['info'],
					//version: '',
				},
				//{
					//path: '',
					//callbacks: ['get'],
					////version: '',
				//},
			],
			get: [
				{
					path: ':database/:cache?',
					callbacks: ['get'],
					//version: '',
				},
			],
			view: [
				{
					path: ':database',
					callbacks: ['periodical_by_path_host'],
					//version: '',
				},
			]
		},
		
		/*api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':prop',
						callbacks: ['get'],
						//version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						//version: '',
					},
				]
			},
			
		},*/
  },
  //get_prop: function (err, resp, body, req){
		
		//if(err){
			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
		//}
		//else{
			//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), body);//capitalize first letter
		//}
		
	//},
	periodical_by_path_host: function (err, resp){
		//console.log('CRADLE GET periodical_by_path_host');
		
		if(err){
			//console.log(err);
			this.fireEvent(this.ON_CONNECT_ERROR, err);
		}
		else{
			////console.log(resp);
			
			var prev = null;
			resp.forEach(function (key, doc, id) {
				if( !doc.metadata['diff'] ){
					if(prev == null){
						//prev = JSON.encode(doc.data);
						prev = doc;
					}
					else{
						////console.log(jsonpatch.compare(prev.data, doc.data));
						////console.log(JSON.encode(doc.data));
						////console.log(diff.compare(prev, JSON.encode(doc.data)));
						//prev = JSON.encode(doc.data);
						////console.log(prev);
						//console.log('---SIZE PREV: '+sizeof(prev.data));
						
						////console.log(doc.data);
						////console.log('---SIZE CURRENT: '+sizeof(doc.data));
						
						var diff = jdelta.diff(prev.data, doc.data);
						
						doc.metadata['diff'] = prev._id;
						
						this.save(
							{
								uri: 'dashboard',
								id: doc._id,
								rev: doc._rev,
								data: {metadata: doc.metadata, data: diff}
							},
							function(err, resp){
								//console.log('--SAVING---');
								//console.log(err);
								//console.log(resp);
							}
						);
						
						////console.log(diff);
						////console.log('---SIZE DIFF: '+sizeof(diff));
						//var patch = jsonpatch.compare(prev, doc.data);
						////console.log('---SIZE PATCH: '+sizeof(patch));
						
						//var restored = jdelta.applyDiff(prev.data, diff);
						
						////console.log(restored);
						
						////console.log('---SIZE RESTORED: '+sizeof(restored));
						
						////console.log(doc._rev);
						
						//prev = doc;
					}
					////console.log(JSON.encode(doc));
					//console.log("%s has view key %s.", id, key);
				}
			}.bind(this));
			
			//this.compact({uri: 'dashboard'}, function(err, resp){
				////console.log('---COMPACTED--');
				////console.log(err);
				////console.log(resp);
			//});
		}
	},
	get: function (err, resp){
		//console.log('CRADLE GET');
		//console.log(resp);
		//console.log(this.options.requests.current);
	},
	info: function (err, resp){
		//console.log('CRADLE INFO');
		//console.log(resp);
		//console.log(this.options.requests.current);
	},
  //get: function (err, resp, body, req){
		////console.log('OS GET');
		////console.log(this.options.requests.current);
		
		//if(err){
			////console.log(err);
			
			//if(req.uri != ''){
				//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
			//}
			//else{
				//this.fireEvent('onGetError', err);
			//}
			
			//this.fireEvent(this.ON_DOC_ERROR, err);
			
			//if(this.options.requests.current.type == 'once'){
				//this.fireEvent(this.ON_INFO_DOC_ERROR, err);
			//}
			//else{
				//this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
			//}
		//}
		//else{
			//////console.log('success');
			
			//if(req.uri != ''){
				//this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), JSON.decode(body));//capitalize first letter
			//}
			//else{
				//this.fireEvent('onGet', JSON.decode(body));
			//}
			
			////this.fireEvent(this.ON_DOC, JSON.decode(body));
			
			//if(this.options.requests.current.type == 'once'){
				//this.fireEvent(this.ON_INFO_DOC, JSON.decode(body));
			//}
			//else{
				//var original = JSON.decode(body);
				//var doc = {};
				
				//doc.loadavg = original.loadavg;
				//doc.uptime = original.uptime;
				//doc.freemem = original.freemem;
				//doc.totalmem = original.totalmem;
				//doc.cpus = original.cpus;
				//doc.networkInterfaces = original.networkInterfaces;
				
				//this.fireEvent(this.ON_PERIODICAL_DOC, doc);
				
				//////console.log('STATUS');
			//}
			
			
		//}
		
  //},
  initialize: function(options){
	
	
		this.parent(options);//override default options
		
		this.log('cradle_test', 'info', 'cradle_test started');

  },
  
	
});

