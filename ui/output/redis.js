'use strict'

var debug = require('debug')('Server:Apps:UI:Output:Redis'),
    debug_internals = require('debug')('Server:Apps:UI:Output:Redis:Internals'),
    debug_events = require('debug')('Server:Apps:UI:Output:Redis:Events');

let App = require('js-caching/libs/stores/redis').output
// let App = require('js-pipeline/output/redis')

module.exports = new Class({
  Extends: App,

  _save_docs: function(doc, index){
		debug_internals('_save_docs %o %s %o', doc, index, this.options.insert);

    if(!Array.isArray(doc)) doc = [doc]

    let db = this.options.conn[index].db
    let channel = this.options.conn[index].channel
    // let table = this.options.conn[index].table
    let conn = this.conns[index]

    let multi = conn.multi()
    let keys = []
    Array.each(doc, function(d, i){
      let key = d.id
      delete d.id

      keys.push(key)

      multi.set(key, JSON.stringify(d))

      // multi.publish(channel, key)


      if(i == doc.length -1)
        multi.exec(function (err, result) {
          debug_internals('multi.exec', err, result)
          this.fireEvent(this.ON_DOC_SAVED, [err, result])
          conn.publish(channel, keys.join(','), function (err, result) {
            debug_internals('publish', err, result)
          })
        }.bind(this))
    }.bind(this))

    /**
    * publish separated from SET, as we don't want to fire event DOC_SAVED on pubish
    **/
    // multi = conn.multi()
    // Array.each(keys, function(key, i){
    //   multi.publish(channel, key)
    //
    //   if(i == keys.length -1)
    //     multi.exec(function (err, result) {
    //       debug_internals('multi.exec publish', err, result)
    //       // this.fireEvent(this.ON_DOC_SAVED, [err, result])
    //     }.bind(this))
    // }.bind(this))

    // this.r.db(db).table(table).insert(doc, this.options.insert).run(conn, function(err, result){
    //   debug_internals('insert result %o', err, result);
    //   this.fireEvent(this.ON_DOC_SAVED, [err, result])
    // }.bind(this))

	},

})
