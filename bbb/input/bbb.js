'use strict'

// let App = require('node-app-bbb-client');
let App = require('node-app');

let debug = require('debug')('Server:Apps:BBB:Input');
let debug_internals = require('debug')('Server:Apps:BBB:Input:Internals');

// let bbb = require('nodejs-bigbluebutton')
let bbb = require('bbb-promise');


// let __white_black_lists_filter = function(whitelist, blacklist, str){
//   let filtered = false
//   if(!blacklist && !whitelist){
//     filtered = true
//   }
//   else if(blacklist && !blacklist.test(str)){
//     filtered = true
//   }
//   else if(blacklist && blacklist.test(str) && (whitelist && whitelist.test(str))){
//     filtered = true
//   }
//   else if(!blacklist && (whitelist && whitelist.test(str))){
//     filtered = true
//   }
//
//   return filtered
// }

module.exports = new Class({
  Extends: App,

  id: 'bbb.meetings',

  ON_CONNECT: 'onConnect',
  ON_CONNECT_ERROR: 'onConnectError',

  MEETING_TEMPLATE: {
    meetingName: '',
    meetingID: '',
    createTime: 0,
    running: false,
    duration: 0,
    hasUserJoined: false,
    startTime: 0,
    endTime: 0,
    participantCount: 0,
    listenerCount: 0,
    voiceParticipantCount: 0,
    videoCount: 0,
    maxUsers: 0,
    moderatorCount: 0,
    attendees: [ ],
    metadata: 0,
  },
  // // modules: [],
  //
  // // node: undefined,//bbb host
  // meetings : [],

  options: {

    // // whitelist: /^(users|vmstat|nginx.*)/g,
    // // blacklist: /^.*/g, //blacklist all modules
    // whitelist: /^.*/g,
    // // blacklist: /^[.]/g,
    // blacklist: /^cpu|^if|^load|^netstat|^ntp|^uptime|^df|^irq|^uptime|^users|^interrupts/g,

    requests : {
			once: [
        {
          meetings:  function(req, next, app){

            app.bbb.monitoring.getMeetings().then(function(resp){
              if(resp && resp.response && resp.response.meetings){
                debug('periodical meetings', resp.response.returncode, resp.response.meetings)

                let err
                if(resp.response.returncode[0] !== 'SUCCESS') err = resp.response.returncode[0]
                app.set_meetings(err, resp.response.meetings, {
                  _extras: {}
                })
              }
            }.bind(app))
          }
        },
			],
			periodical: [
				{
          meetings:  function(req, next, app){

            app.bbb.monitoring.getMeetings().then(function(resp){
              if(resp && resp.response && resp.response.meetings){
                debug('periodical meetings', resp.response.returncode, resp.response.meetings)

                let err
                if(resp.response.returncode[0] !== 'SUCCESS') err = resp.response.returncode[0]
                app.set_meetings(err, resp.response.meetings, {
                  _extras: {}
                })
              }
            }.bind(app))
          }
        },
        // {
        //   meeting:  function(req, next, app){
        //
        //     Array.each(app.meetings, function(row){
        //       debug('periodical meeting', row)
        //       let _id = row.meeting[0].meetingID[0]
        //       app.bbb.monitoring.getMeetingInfo(_id).then(function(resp){
        //         debug('getMeetingInfo', resp)
        //
        //         let err
        //         if(resp.response.returncode[0] !== 'SUCCESS') err = resp.response.returncode[0]
        //         app.meeting(err, resp.response, {
        //           _extras: {}
        //         })
        //         // if(resp && resp.response && resp.response.meetings){
        //         //   let err
        //         //   if(!resp.response.returncode !== 'SUCCESS') err = resp.response.returncode
        //         //   app.meetings(err, resp.response.meetings, {
        //         //     _extras: {}
        //         //   })
        //         // }
        //       }.bind(app))
        //
        //     }.bind(app))
        //
        //   }
        // },
				//{ fetch: { uri: 'cpu' } },
				//{ fetch: { uri: 'if_eth0' } },
				//{ config: { uri: 'if_eth0' } },
				//{ nodes: { uri: '' } },
				//{ quit: { uri: '' } },
			],
			//range: [
				////{ get: {uri: 'dashboard/cache', doc: 'localhost.colo.os.blockdevices@1515636560970'} },
			//],

		},

		routes: {
			// fetch: [
			// 	{
			// 		path: ':module',
			// 		callbacks: ['fetch']
      //
			// 	},
			// ],
			// list: [
			// 	{
			// 		path: '',
			// 		callbacks: ['list']
      //
			// 	},
			// ],
      // nodes: [
      //   {
      //     path: '',
      //     callbacks: ['nodes']
      //   },
      // ],
			//quit: [
				//{
					//path: '',
					//callbacks: ['quit']

				//},
			//],
			//config: [
				//{
					//path: ':module',
					//callbacks: ['config']

				//},
			//],
		},

  },

  set_meetings: function (err, resp, params){
		debug('meetings %s %o', err, resp);
		debug('meetings params %o', params);

    if(err){
			debug_internals('meetings err %o', err);

      // if(params.uri != ''){
			// 	this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
			// }
			// else{
			// 	this.fireEvent('onGetError', err);
			// }

			this.fireEvent(this.ON_DOC_ERROR, err);

			this.fireEvent(
				this[
					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
				],
				err
			);
		}
		else{
      // this.meetings = resp
      let meetings = []
      if(resp && Array.isArray(resp) && resp.length > 0 && resp[0] !== ''){
        Array.each(resp, function(row){
          debug('periodical meeting', row)
          if(row.meeting && row.meeting[0]){
            let _meeting = {}

            Object.each(row.meeting[0], function(val, prop){
              let _val = (prop !== 'attendees') ? val[0] : val//removes arrays, except for 'attendees'
              if(!Array.isArray(_val)){
                _val = (isNaN(_val * 1)) ? _val : _val * 1
                _val = (_val == 'true') ? true : _val
                _val = (_val == 'false') ? false : _val
              }

              _meeting[prop] = _val
            }.bind(this))

            // _meeting = JSON.parse(JSON.stringify(_meeting))

            debug('periodical _meeting', _meeting)

            meetings.push(_meeting)
          }
        }.bind(this))
      }
      else{
        meetings.push(this.MEETING_TEMPLATE)
      }


      if(meetings.length > 0)
        this.fireEvent(
          this[
            'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
          ],
          [{meetings: meetings, host: this.options.host}, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
        )



		}

  },
	// fetch: function (err, resp, params){
	// 	debug('save %o', resp);
	// 	debug('save params %o', params);
  //
	// 	if(err){
	// 		debug('save err %o', err);
  //
  //     if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGetError', err);
	// 		}
  //
	// 		this.fireEvent(this.ON_DOC_ERROR, err);
  //
	// 		this.fireEvent(
	// 			this[
	// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
	// 			],
	// 			err
	// 		);
	// 	}
	// 	// else{
  //   /**
  //   * even with err response emit doc (doc.data = {}) and filter later
  //   **/
	// 		////console.log('success');
  //
	// 		if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1), [JSON.decode(resp), {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGet', [JSON.decode(resp), {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]);
	// 		}
  //
  //
  //     //if(typeof(resp) == 'array' || resp instanceof Array || Array.isArray(resp))
	// 			//resp = [resp];
  //     let new_data = {}
  //     let mem = /memory/
  //
  //     if(resp && resp !== null)
  //       Object.each(resp, function(data, key){
  //         let new_key = key.replace(/\_/, '')
  //
  //         if(mem.test(params.uri))
  //           data = (data / 1024 / 1024).toFixed(2) * 1
  //
  //         new_data[new_key] = data
  //         // delete resp[key]
  //       })
  //
  //     debug('modified data %o', new_data);
  //
	// 		let doc = {};
	// 		doc.data = new_data
	// 		doc.id = params.uri
  //     // doc.host = this.options.host
  //     doc.host = this.node
  //
  //     // debug_internals('OPTIONS', this.options.host)
  //
	// 		// this.fireEvent(
	// 		// 	this[
	// 		// 		'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
	// 		// 	],
	// 		// 	doc
	// 		// );
  //     this.fireEvent(
  //       this[
  //         'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
  //       ],
  //       [doc, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
  //     )
  //
	// 	// }
	// },

  // nodes: function (err, resp, params){
	// 	debug_internals('nodes %o', resp);
	// 	debug_internals('nodes params %o', params);
  //
	// 	if(err){
	// 		debug_internals('nodes err %o', err);
  //
  //     if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGetError', err);
	// 		}
  //
	// 		this.fireEvent(this.ON_DOC_ERROR, err);
  //
	// 		this.fireEvent(
	// 			this[
	// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
	// 			],
	// 			err
	// 		);
	// 	}
	// 	else{
  //     // this.node = resp[0]
  //     /**
  //     * @hack: system (as a whole) doens't support fqdn yet, so we try to remove domains
  //     **/
  //     if(resp[0].indexOf('.') > -1){
  //       this.node = resp[0].substring(0, resp[0].indexOf('.'))
  //     }
  //     else{
  //       this.node = resp[0]
  //     }
  //
  //     this.options.id = this.node
  //
  //     this.list({uri: ''})
  //     // Array.each(resp, function(module, index){
  //     //   // module = module.trim()
  //     //
  //     //   // debug_internals('module %o', module, blacklist.test(module), whitelist.test(module));
  //     //
  //     //   blacklist.lastIndex = 0
  //     //   whitelist.lastIndex = 0
  //     //
  //     //
  //     //   // if(blacklist == null || blacklist.test(module) == false)//not in blacklist
  //     //   //   if(whitelist == null || whitelist.test(module) == true)//if no whitelist, or in whitelist
  //     //   if(__white_black_lists_filter(whitelist, blacklist, module)){
	// 		//       this.options.requests.periodical.push( { fetch: { uri: module } });
  //     //
  //     //       debug_internals('module %s', module);
  //     //   }
  //     //
	// 		// 	if(index == resp.length - 1){
	// 		// 		// this.fireEvent(this.ON_PERIODICAL_REQUESTS_UPDATED);
  //     //     this.fireEvent(
  //     //       this['ON_PERIODICAL_REQUESTS_UPDATED'],
  //     //       [resp, {id: this.id, type: this.options.requests.current.type, input_type: this, app: this}]
  //     //     )
  //     //   }
  //     //
  //     //   // blacklist.lastIndex = 0
  //     //   // whitelist.lastIndex = 0
  //     //
  //     //
	// 		// }.bind(this));
  //
	// 	}
	// },
	// //nodes: function (err, resp, options){
	// 	//debug_internals('nodes %o', resp);
	// 	//debug_internals('nodes options %o', options);
	// //},
	// //quit: function (err, resp, options){
	// 	//debug_internals('quit %o', resp);
	// 	//debug_internals('quit options %o', options);
	// //},
	// //config: function (err, resp, options){
	// 	//debug_internals('config err %o', err);
	// 	//debug_internals('config %o', resp);
	// 	//debug_internals('config options %o', options);
	// //},
  initialize: function(options){

		this.parent(options);//override default options

    // this.bbb = bbb
    // this.bbb.salt = this.options.salt
    // this.bbb.url = this.options.url
    // this.bbb.getMeetings(function (response) {
    //   debug('create', response)
    // });
    this.bbb = bbb.server(this.options.url, this.options.salt);

    this.fireEvent(this.ON_CONNECT)

    this.bbb.monitoring.getMeetings().then(function(info) {
      this.fireEvent(this.ON_CONNECT)
      // debug('getMeetings %O', info)
    }.bind(this));

		this.log('bbb', 'info', 'bbb started');

		debug_internals('initialized %o', options);

  },


});
