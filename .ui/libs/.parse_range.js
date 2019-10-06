/**
* taken from js-pipeline/input/poller/index.js@build_range function
* @todo create an npm module and use on "js-pipeline/input/poller/index.js" && "mngr-ui-admin.apps/hosts/index.js"
**/
'use strict'

module.exports = function(range){
  var words = /(\w+)(?:\s)(\w+)(?:-)(\w+)/g;
  var match = words.exec(range);
  var type = match[1].toLowerCase();

  //////console.log('--HEADER---');
  //////console.log(match);

  var start, end;

  switch (type){
    case 'date':
    case 'utc':
      var date = /^(\d\d\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?$/;
      start = date.exec(match[2]);
      end = date.exec(match[3]);

      //////console.log(start);
      //////console.log(end);

      start.forEach(function(value, i){
        if(!value)
          start[i] = 0;
      });

      end.forEach(function(value, i){
        if(!value)
          end[i] = 0;
      });

      if(type == 'utc'){
        start = new Date(
          Date.UTC(start[1], start[2], start[3], start[4], start[5], start[6], start[7])
        ).getTime();

        end = new Date(
          Date.UTC(end[1], end[2], end[3], end[4], end[5], end[6], end[7])
        ).getTime();
      }
      else{
        start = new Date(start[1], start[2], start[3], start[4], start[5], start[6], start[7]).getTime();
        end = new Date(end[1], end[2], end[3], end[4], end[5], end[6], end[7]).getTime();
      }


    break;

    case 'posix':
    case 'epoch':
      start = parseInt(match[2]);
      end = parseInt(match[3]);

    break;

    default:
      throw new Error('Type ['+type+'] not implemented');

  };


  return {
    type: type,
    start: start,
    end: end
  }
}
