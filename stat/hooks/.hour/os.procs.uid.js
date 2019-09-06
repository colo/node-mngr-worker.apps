'use strict'

var debug = require('debug')('Server:Apps:Historical:Hour:Hook:OS:Procs:UID');
var debug_internals = require('debug')('Server:Apps:Historical:Hour:Hook:OS:Procs:UID:Internals');

module.exports = Object.merge(
  Object.clone(require('./os.blockdevices')),
  {dev:{ dev: new RegExp('^.+$') }}
)
