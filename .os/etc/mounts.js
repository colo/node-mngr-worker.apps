'use strict'

module.exports = function(){
  return {
    type_filter: /^ext|^xfs/,
    // mount_filter: /^(?!.*(\/var\/www|\/var\/backups))/
  }
}
