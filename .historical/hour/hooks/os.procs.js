'use strict'

var debug = require('debug')('Server:Apps:Historical:Hour:Hook:OS:Procs');
var debug_internals = require('debug')('Server:Apps:Historical:Hour:Hook:OS:Procs:Internals');

module.exports = Object.merge(
  Object.clone(require('./os.blockdevices')),
  {dev:{ dev: new RegExp('^.+$') }}
)
