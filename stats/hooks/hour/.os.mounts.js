'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Mounts');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Hour:OS:Mounts:Internals');

module.exports = Object.merge(
  Object.clone(require('./os.blockdevices')),
  {dev:{ dev: new RegExp('^.+$') }}
)
