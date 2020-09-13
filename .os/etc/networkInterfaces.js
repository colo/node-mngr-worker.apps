'use strict'

module.exports = function(){
  return {
    messure_filter: /^((?!multicast|frame|compressed|fifo).)*$/, //this RegExp is negated
    iface_filter: /^((?!tap).)*$/ //this RegExp is negated
  }
}
