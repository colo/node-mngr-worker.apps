'use strict'

let App = require('js-pipeline/output/rethinkdb')

var debug = require('debug')('Server:Apps:Logs:Nginx:Output:RethinkDBGeoSpatial');
var debug_events = require('debug')('Server:Apps:Logs:Nginx:Output:RethinkDBGeoSpatial:Events');
var debug_internals = require('debug')('Server:Apps:Logs:Nginx:Output:RethinkDBGeoSpatial:Internals');


module.exports = new Class({
  Extends: App,

  _save_docs: function(doc, index){
    // debug_internals('_save_docs %o %s %o', doc, index)
    if(!Array.isArray(doc))
      doc = [doc]

    Array.each(doc, function(d, d_index){
      // debug_internals('point %o %d %d', d.data.geoip.location, d.data.geoip.location.latitude, d.data.geoip.location.longitude)
      if(d.data.geoip.location && d.data.geoip.location.latitude && d.data.geoip.location.longitude)
        d.data.location = this.r.point(d.data.geoip.location.longitude, d.data.geoip.location.latitude)

      debug_internals('_save_docs %o ', d.metadata.location)
      if(d_index === doc.length -1 ){
        // debug_internals('_save_docs %o %s %o', doc, index)

        this.parent(doc, index)
      }
    }.bind(this))


  }
})
