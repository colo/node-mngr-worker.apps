'use strict'

const ss = require('simple-statistics')

module.exports = function(value){
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
