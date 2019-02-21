/**
* @todo create an npm module and use on "js-pipeline/input/poller/index.js" && "mngr-ui-admin.apps/hosts/index.js"
**/
'use strict'

module.exports = function(range){
  return range.type+' '+range.start+'-'+range.end+'/*'
}
