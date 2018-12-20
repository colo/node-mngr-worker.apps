'use strict'

var debug = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Minute:Hook:OS:Internals');

module.exports = {
  cpus: {
    build_key: function(entry_point, timestamp, value){
      entry_point.cpus = []
      Array.each(value, function(cpu, core){
        entry_point.cpus[core] = {};

        entry_point.cpus[core][timestamp] = {}
      });//iterate on each core

      return entry_point
    },
    build_value: function(entry_point, timestamp, value){
      Array.each(value, function(cpu, core){
        // if(!entry_point[core]) entry_point[core] = {};
        //   // values[host][path][key][core] = [];

        let data = {};
        data = {
          speed: cpu.speed,
          times: cpu.times
        };

        // //debug_internals('os-stats filter core %d', core);
        // values[host][path][key][core].push(data);
        entry_point[core][timestamp] = data
      });//iterate on each core

      return entry_point
    }

  },
  networkInterfaces: {
    build_key: function(entry_point, timestamp, value){
      entry_point.networkInterfaces = undefined
      return entry_point
    }
  }
}
