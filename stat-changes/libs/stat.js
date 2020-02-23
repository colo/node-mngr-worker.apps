'use strict'

const ss = require('simple-statistics')
let debug = require('debug')('Server:Apps:Stat:libs:stat');

// const hour = function(value){
//   debug('hour %o', value)
//   // Object.each(value, function(item, key){
//   //
//   // })
//   // process.exit(1)
// }
// const generic = function(value){
//   debug('value %o', value)
//   // process.exit(1)
//
//   let data_values = Object.values(value);
//   let min = ss.min(data_values);
//   let max = ss.max(data_values);
//
//   return {
//     // samples : value,
//     min : min,
//     max : max,
//     mean : ss.mean(data_values),
//     median : ss.median(data_values),
//     mode : ss.mode(data_values),
//     sum: ss.sumSimple(data_values),
//     range: max - min
//   }
// }

// exports.hour = hour
// exports.minute = generic
const merge_historicals = function(values){
  let _values = {}
  Array.each(values, function(val){
    if(Object.getLength(val) > 0 && isNaN(val)){
      Object.each(val, function(data, prop){
        if(!_values[prop]) _values[prop] = []

        _values[prop].push(data)
      })
    }
  })
  return (Object.getLength(_values)) ? _values : values
}
module.exports = function(value){



  let data_values = Object.values(value);

  data_values = merge_historicals(data_values)

  let min = ( data_values.min ) ? ss.min(data_values.min) : ss.min(data_values)
  let max = ( data_values.max ) ? ss.max(data_values.max) : ss.max(data_values)
  // if(min === undefined){
    // debug('value %o', value, data_values)
    // process.exit(1)
  // }

  return {
    // samples : value,
    min : min,
    max : max,
    mean : ( data_values.mean ) ? ss.mean(data_values.mean) : ss.mean(data_values),
    median : ( data_values.median ) ? ss.median(data_values.median) : ss.median(data_values),
    mode : ( data_values.median ) ? ss.mode(data_values.median) : ss.mode(data_values),
    sum: ( data_values.sum ) ? ss.sumSimple(data_values.sum) : ss.sumSimple(data_values),
    range: max - min
  }
}
