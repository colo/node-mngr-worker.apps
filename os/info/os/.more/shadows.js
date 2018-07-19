'use strict'

var App = require('node-app-http-client');
	


module.exports = new Class({
  Extends: App,
  
  options: {
	  
	  requests : {
			once: [
				{ api: { get: {uri: ''} } },
				
			],
			//periodical: [
				//{ api: { get: {uri: ''} } },
			//],
			
		},
	
		routes: {
		},
		
		api: {
			
			version: '1.0.0',
			
			routes: {
				get: [
					{
						path: ':uid',
						callbacks: ['get_shadow'],
						version: '',
					},
					{
						path: ':uid/:prop',
						callbacks: ['get_shadow'],
						version: '',
					},
					{
						path: '',
						callbacks: ['get'],
						version: '',
					},
				]
			},
			
		},
  },
  //get_shadow: function (err, resp, body){
		////console.log('OS SHADOW get_shadow');
		
		////console.log('error');
		////console.log(err);
		
		//////console.log('resp');
		//////console.log(resp);
		
		////console.log('body');
		////console.log(body);
  //},
  get: function (err, resp, body, req){
		//console.log('OS SHADOWS get');
		
		if(err){
			//console.log(err);
			
			if(req.uri != ''){
				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1)+'Error', err);//capitalize first letter
			}
			else{
				this.fireEvent('onGetError', err);
			}
			
			this.fireEvent(this.ON_DOC_ERROR, err);
			
			if(this.options.requests.current.type == 'once'){
				this.fireEvent(this.ON_ONCE_DOC_ERROR, err);
			}
			else{
				this.fireEvent(this.ON_PERIODICAL_DOC_ERROR, err);
			}
		}
		else{
			////console.log('success');
			
			if(req.uri != ''){
				this.fireEvent('on'+req.uri.charAt(0).toUpperCase() + req.uri.slice(1), JSON.decode(body));//capitalize first letter
			}
			else{
				this.fireEvent('onGet', JSON.decode(body));
			}
			
			var body = JSON.decode(body);
			Array.each(body, function(item, index){
				delete body[index].password;
			})
			
			////console.log(body);
			
			if(this.options.requests.current.type == 'once'){
				this.fireEvent(this.ON_ONCE_DOC, { data: body });
			}
			else{
				this.fireEvent(this.ON_PERIODICAL_DOC, { data: body });
			}
			
			
		}
  },
  initialize: function(options){
	
		this.parent(options);//override default options
		
		this.log('os-shadows', 'info', 'os-shadows started');
  },
	
});

