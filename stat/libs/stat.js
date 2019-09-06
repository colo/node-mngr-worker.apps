'use strict'

const ss = require('simple-statistics')
let debug = require('debug')('Server:Apps:Stat:libs:stat');

const hour = function(value){
  debug('hour %o', value)
  // Object.each(value, )
  process.exit(1)
}
const generic = function(value){
  debug('generic %o', value)
  process.exit(1)
  
  let data_values = Object.values(value);
  let min = ss.min(data_values);
  let max = ss.max(data_values);

  return {
    // samples : value,
    min : min,
    max : max,
    mean : ss.mean(data_values),
    median : ss.median(data_values),
    mode : ss.mode(data_values),
    sum: ss.sumSimple(data_values),
    range: max - min
  }
}

exports.hour = hour
exports.minute = generic
// module.exports =
