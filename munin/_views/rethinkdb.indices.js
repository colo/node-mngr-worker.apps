//const HOST = '127.0.0.1'
const HOST = 'elk'
// const PORT = 28016
const PORT = 28015
const DATABASES = ['devel', 'production']
// const TABLES = ['periodical', 'historical']
const TABLES = ['munin']


// const DATABASE = 'historical'

let App = require('node-app-rethinkdb-client')

var debug = require('debug')('os:info:_views:rethinkdb.indices')

let MyApp = new Class({
  Extends: App,

  options: {
    routes: {
      close: [{
				path: '',
				callbacks: ['close']
      }],
      // reconnect: [{
			// 	path: '',
			// 	callbacks: ['reconnect']
      // }],
      // use: [{
			// 	path: ':database',
			// 	callbacks: ['use']
      // }],
      // noreplyWait: [{
			// 	path: '',
			// 	callbacks: ['noreplyWait']
      // }],
      // server: [{
			// 	path: '',
			// 	callbacks: ['server']
      // }],
      // dbList: [{
			// 	path: '',
			// 	callbacks: ['dbList']
      // }],
      dbDrop: [{
				path: ':database',
				callbacks: ['dbDrop']
      }],
      dbCreate: [{
				path: ':database',
				callbacks: ['dbCreate']
      }],
      // // tableList: [{
			// // 	path: ':database',
			// // 	callbacks: ['tableList']
      // // }],
      // tableDrop: [{
      //   path: ':database',
      //   callbacks: ['tableDrop']
      // }],
      tableCreate: [{
        path: ':database?',
        callbacks: ['tableCreate']
      }],
      indexCreate: [{
        path: ':database/:table',
        callbacks: ['indexCreate']
      }],
      // indexStatus: [{
      //   path: ':database/:table',
      //   callbacks: ['indexStatus']
      // }],
      // indexWait: [{
      //   path: ':database/:table',
      //   callbacks: ['indexWait']
      // }],
      // indexList: [{
      //   path: ':database/:table',
      //   callbacks: ['indexList']
      // }],
      // indexRename: [{
      //   path: ':database/:table',
      //   callbacks: ['indexRename']
      // }],
      // indexDrop: [{
      //   path: ':database/:table',
      //   callbacks: ['indexDrop']
      // }],
      // insert: [{
      //   path: ':database/:table',
      //   callbacks: ['insert']
      // }],
      // update: [{
      //   path: ':database/:table',
      //   callbacks: ['update']
      // }],
      // replace: [{
      //   path: ':database/:table',
      //   callbacks: ['replace']
      // }],
      // sync: [{
      //   path: ':database/:table',
      //   callbacks: ['sync']
      // }],
      // delete: [{
      //   path: ':database/:table',
      //   callbacks: ['delete']
      // }],
      // get: [{
      //   path: ':database/:table',
      //   callbacks: ['get']
      // }],
      // getAll: [{
      //   path: ':database/:table',
      //   callbacks: ['getAll']
      // }],
      // between: [{
      //   path: ':database/:table',
      //   callbacks: ['between']
      // }],
      // filter: [{
      //   path: ':database/:table',
      //   callbacks: ['filter']
      // }],
      // map: [{
      //   path: ':database/:table',
      //   callbacks: ['map']
      // }],
      // withFields: [{
      //   path: ':database/:table',
      //   callbacks: ['withFields']
      // }],
      // concatMap: [{
      //   path: ':database/:table',
      //   callbacks: ['concatMap']
      // }],
      // orderBy: [{
      //   path: ':database/:table',
      //   callbacks: ['orderBy']
      // }],
    },
  },

  initialize: function(options, cb){
    this.parent(options, cb)
  },
  close: function(){
    debug('close %o', arguments)
    // this.reconnect({args: [{noreplyWait: true}]})
  },
  // reconnect: function(){
  //   debug('reconnect %o', arguments)
  //   this.use({ uri: 'test' })
  // },
  // use: function(){
  //   debug('use %o', arguments)
  //   this.noreplyWait()
  // },
  // noreplyWait: function(){
  //   debug('noreplyWait %o', arguments)
  //   this.server()
  // },
  // server: function(){
  //   debug('server %o', arguments)
  //   this.dbList()
  // },
  // dbList: function(){
  //   debug('dbList %o', arguments)
  //   this.dbDrop({uri: 'test'})
  // },
  dbDrop: function(err, resp, params){
    debug('dbDrop %o', params)
    this.dbCreate({uri: params.uri})
  },
  dbCreate: function(err, resp, params){
    debug('dbCreate %o', params)

    Array.each(TABLES, function(table){
      this.tableCreate({uri: params.uri, args:[table]})
    }.bind(this))


  },
  // tableList: function(){
  //   debug('tableList %o', arguments)
  //   // this.tableDrop({uri: 'test', args:['test_table']})
  //   this.indexCreate({uri: 'test/test_table', args:['testIndex']})
  // },
  // tableDrop: function(){
  //   debug('tableDrop %o', arguments)
  //   // this.tableCreate({uri: 'test', args:['test_table']})
  // },
  tableCreate: function(err, resp, params){
    debug('tableCreate %o',this.r.row("metadata")("timestamp"))
    // console.log(this.r.row("metadata")("timestamp"))

    this.indexCreate({
      uri: params.options.uri+'/'+params.options.args[0],
      args:'path',
      row: this.r.row("metadata")("path")
    })

    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'domain',
    //   row: this.r.row("metadata")("domain")
    // })

    this.indexCreate({
      uri: params.options.uri+'/'+params.options.args[0],
      args:'timestamp',
      row: this.r.row("metadata")("timestamp")
    })
    this.indexCreate({
      uri: params.options.uri+'/'+params.options.args[0],
      args:'host',
      row: this.r.row("metadata")("host")
    })
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'path',
    //   row: this.r.row("metadata")("path")
    // })

    this.indexCreate({
      uri: params.options.uri+'/'+params.options.args[0],
      args:'type',
      row: this.r.row("metadata")("type"),
    })

    this.indexCreate({
      uri: params.options.uri+'/'+params.options.args[0],
      args:'tag',
      row: this.r.row("metadata")("tag"),
      opts: {multi:true}
    })

    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'path.timestamp',
    //   row: [
    //     this.r.row("metadata")("path"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'domain.timestamp',
    //   row: [
    //     this.r.row("metadata")("domain"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'host.timestamp',
    //   row: [
    //     this.r.row("metadata")("host"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'type.timestamp',
    //   row: [
    //     this.r.row("metadata")("type"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'tag.timestamp',
    //   row: row => row("metadata")("tag").
    //     map(
    //       tag => [tag, row("metadata")("timestamp")]
    //     ),
    //   opts: {multi:true}
    // })

    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'sort_by_path',
    //   row: [
    //     this.r.row("metadata")("path"),
    //     this.r.row("metadata")("host"),
    //     this.r.row("metadata")("type"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'logs_by_host_type_timestamp',
    //   row: row => row("metadata")("tags").
    //     map(
    //       tag => [row('metadata')("host"), row("metadata")("type"), tag, row("metadata")("timestamp")]
    //     ),
    //   opts: {multi:true}
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'logs_by_domain_type_tag_timestamp',
    //   row: row => row("metadata")("tags").
    //     map(
    //       tag => [row('metadata')("domain"), row("metadata")("type"), tag, row("metadata")("timestamp")]
    //     ),
    //   opts: {multi:true}
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args:'logs_by_domain_type_data.timestamp',
    //   row: [
    //     this.r.row("metadata")("domain"),
    //     this.r.row("metadata")("type"),
    //     this.r.row("metadata")("timestamp")
    //   ]
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args: 'logs_by_data.location',
    //   row: this.r.row("data")("location"),
    //   opts: {geo: true}
    // })
    //
    // this.indexCreate({
    //   uri: params.options.uri+'/'+params.options.args[0],
    //   args: 'logs_by_data.timestamp',
    //   row: this.r.row("data")("timestamp"),
    // })
    //
    // // this.indexCreate({
    // //   uri: params.options.uri+'/'+params.options.args[0],
    // //   // args: ['sort_by_domain_data.timestamp',
    // //   //   row => row("metadata")("tags").
    // //   //   map(
    // //   //     tag => [row('metadata')("domain"), row("metadata")("type"), tag, row("data")("timestamp")]
    // //   //   ), {multi: true}
    // //   // ]
    // //   args:'sort_by_domain_data.timestamp',
    // //   row: row => row("metadata")("tags").
    // //     map(
    // //       tag => [row('metadata')("domain"), row("metadata")("type"), tag, row("data")("timestamp")]
    // //     ),
    // //   opts: {multi:true}
    // // })

    // this.tableList({uri: 'test'})
    // this.tableDrop({uri: 'test', args:['test_table']})
  },
  indexCreate: function(){
    debug('indexCreate %o', arguments)
    // this.indexStatus({uri: 'test/test_table', args:['testIndex']})
    // this.close()
  },
  // indexStatus: function(){
  //   debug('indexStatus %o', arguments)
  //   this.indexWait({uri: 'test/test_table', args:['testIndex']})
  //
  // },
  // indexWait: function(){
  //   debug('indexWait %o', arguments)
  //   this.indexList({uri: 'test/test_table'})
  //
  // },
  // indexList: function(){
  //   debug('indexList %o', arguments)
  //   this.indexRename({uri: 'test/test_table', args:['testIndex', 'title', {overwrite: false}]})
  // },
  // indexRename: function(){
  //   debug('indexRename %o', arguments)
  //   // this.indexDrop({uri: 'test/test_table', args:['renamedIndex']})
  //   debug('indexDrop %o', arguments)
  //   this.insert({uri: 'test/test_table', args:[{
  //       id: 1,
  //       title: "Lorem ipsum",
  //       content: "Dolor sit amet"
  //   }]})
  // },
  // // indexDrop: function(){
  // //   debug('indexDrop %o', arguments)
  // //   this.insert({uri: 'test/test_table', args:[{
  // //       id: 1,
  // //       title: "Lorem ipsum",
  // //       content: "Dolor sit amet"
  // //   }]})
  // // },
  // insert: function(){
  //   debug('insert %o', arguments)
  //   this.update({uri: 'test/test_table', args:[{status: "published"}]})
  // },
  // update: function(){
  //   debug('update %o', arguments)
  //   this.replace({uri: 'test/test_table', args:[{
  //       id: 1,
  //       title: "Lorem ipsum",
  //       content: "Dolor sit amet",
  //       status: "unpublished"
  //   }]})
  // },
  // replace: function(){
  //   debug('replace %o', arguments)
  //   this.sync({uri: 'test/test_table'})
  //
  // },
  // sync: function(){
  //   debug('sync %o', arguments)
  //
  //   this.get({uri: 'test/test_table', args: [1]})
  // },
  // delete: function(){
  //   debug('delete %o', arguments)
  //   // this.delete({uri: 'test/test_table'})
  // },
  // get: function(){
  //   debug('get %o', arguments)
  //   this.getAll({uri: 'test/test_table', args: [1]})
  //
  // },
  // getAll: function(){
  //   debug('getAll %o', arguments)
  //   this.between({uri: 'test/test_table', args:[1, 3, {}]})
  // },
  // between: function(){
  //   debug('between %o', arguments)
  //   this.filter({uri: 'test/test_table', args:[{status: "unpublished"}]})
  // },
  // filter: function(){
  //   debug('filter %o', arguments)
  //   // this.delete({uri: 'test/test_table', args:[1, {index: 'renamedIndex'}]})
  //   this.map({
  //     uri: 'test/test_table',
  //     args:function (doc) {
  //       return doc.merge({userId: doc('id')}).without('id');
  //     }
  //   })
  //   // this.map({
  //   //   uri: 'test/test_table',
  //   //   args:[
  //   //     [[100, 200, 300, 400],[10, 20, 30, 40],[1, 2, 3, 4]],
  //   //     function (val1, val2, val3) {
  //   //       return val1.add(val2).add(val3);
  //   //     }
  //   //   ]
  //   // })
  //
  //   // this.map({
  //   //   uri: 'test/test_table',
  //   //   expr: [1, 2, 3, 4, 5],
  //   //   args:function (val) {return val.mul(val);}
  //   // })
  // },
  // map: function(){
  //   debug('map %o', arguments)
  //   this.withFields({uri: 'test/test_table', args:['id', 'status']})
  //
  //   // this.delete({uri: 'test/test_table', args:[1, {index: 'renamedIndex'}]})
  // },
  // withFields: function(){
  //   debug('withFields %o', arguments)
  //
  //   this.concatMap({
  //     uri: 'test/test_table',
  //     expr: [1, 2, 3, 4, 5],
  //     args:function(x) { return [x, x.mul(2)] }
  //   })
  // },
  // concatMap: function(){
  //   debug('concatMap %o', arguments)
  //   this.orderBy({uri: 'test/test_table', args:['status',{index: 'title'}]})
  //
  //   // this.delete({uri: 'test/test_table', args:[1, {index: 'renamedIndex'}]})
  // },
  // orderBy: function(){
  //   debug('orderBy %o', arguments)
  //   // this.withFields({uri: 'test/test_table', args:['id', 'status']})
  //
  //   // this.delete({uri: 'test/test_table', args:[1, {index: 'renamedIndex'}]})
  // },
})

// let run = new MyApp({
//   host: 'elk'
// }, function(err, conn) {
//   if(err) throw err;
//   this.r.db('test').tableCreate('tv_shows').run(conn, function(err, res) {
//     if(err) throw err;
//     console.log(res);
//     this.r.table('tv_shows').insert({ name: 'Star Trek TNG' }).run(conn, function(err, res)
//     {
//       if(err) throw err;
//       console.log(res);
//     });
//   }.bind(this));
// })

let run = new MyApp({
  host: HOST,
  port: PORT
})

run.addEvent('onConnect', function(){
  // console.log(arguments)
  // run.close({args: [{noreplyWait: true}]})

  Array.each(DATABASES, function(db){
    run.dbCreate({uri: db})
    // run.dbDrop({uri: db})
  })


})
