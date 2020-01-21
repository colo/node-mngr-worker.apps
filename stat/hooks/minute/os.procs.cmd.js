'use strict'

var debug = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Procs:CMD');
var debug_internals = require('debug')('Server:Apps:Stat:Hook:Minute:OS:Procs:CMD:Internals');

let ss = require('simple-statistics')

let value_to_data = require('../../libs/value.data')

module.exports = Object.merge(
  Object.clone(require('./os.procs.uid')),
  {proc:{ proc: new RegExp('^.+$') }}
)
