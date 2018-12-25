'use strict'

var debug = require('debug')('Server:Apps:OS:Historical:Hour:Hook:OS:Mounts');
var debug_internals = require('debug')('Server:Apps:OS:Historical:Hour:Hook:OS:Mounts:Internals');

module.exports = Object.merge(
  Object.clone(require('./os.blockdevices')),
  {dev:{ dev: new RegExp('^.+$') }}
)
