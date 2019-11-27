'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Procs:CMD');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Procs:CMD:Internals');

module.exports = Object.merge(
  Object.clone(require('./os.blockdevices')),
  {dev:{ dev: new RegExp('^.+$') }}
)
