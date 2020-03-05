'use strict'

const App = require('js-pipeline.inputs.rethinkdb-rest')

// const App = require ( 'node-app-rethinkdb-client/index' )

let debug = require('debug')('Server:Apps:Stat:Periodical:Input'),
    debug_internals = require('debug')('Server:Apps:Stat:Periodical:Input:Internals');


const pluralize = require('pluralize')

// const uuidv5 = require('uuid/v5')
//
const async = require('async')
//
// const sleep = (milliseconds) => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds))
// }

const roundMilliseconds = function(timestamp){
  let d = new Date(timestamp)
  d.setMilliseconds(0)

  return d.getTime()
}

const roundSeconds = function(timestamp){
  timestamp = roundMilliseconds(timestamp)
  let d = new Date(timestamp)
  d.setSeconds(0)

  return d.getTime()
}

const roundHours = function(timestamp){
  timestamp = roundMinutes(timestamp)
  let d = new Date(timestamp)
  d.setHours(0)

  return d.getTime()
}
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = HOUR * 24
const WEEK = DAY * 7


module.exports = new Class({
  Extends: App,

  ID: '11ef2d6f-44fd-5277-8dc0-06e72b96cc17',
  // registered: {},
  // registered_ids: {},
  // feeds: {},
  // close_feeds: {},
  // changes_buffer: {},
  // changes_buffer_expire: {},
  // periodicals: {},
  //
  // // FROM: 'periodical',
  // RANGES: {
  //   'periodical': 10000,
  //   'historical': 60000,
  //
  // },
  options: {
    changes: {includeTypes: true, squash: false},

    db: undefined,
    table: undefined,
    type: undefined,

		requests : {
      once: [
        {
          /**
          * default query from mngr-ui-admin/libs/pipelines/input/rethinkdb
          **/
					default: function(req, next, app){
            req = (req)
            ? Object.clone(req)
            : (app.options && app.options.requests && app.options.requests.req)
              ? Object.merge({ params: {}, query: {}}, Object.clone(app.options.requests.req))
              : { params: {}, query: {} }

            if(req.id === 'once'){

              let _default = function(){
                debug_internals('default ONCE %o %o', req, app.options.table)
                // process.exit(1)
                // let distinct_indexes = (req.params && req.params.prop ) ? pluralize(req.params.prop, 1) : app.distinct_indexes
                // if(!Array.isArray(distinct_indexes))
                //   distinct_indexes = [distinct_indexes]
                //
                // debug_internals('property', distinct_indexes);

                let from = req.from || app.options.table


                let query = app.r
                  .db(app.options.db)
                  .table(from)

                // query = (req.params.prop && req.params.value)
                // ? query
                //   .getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
                // : query
                if(req.params.prop && req.params.value){
                  if(!Array.isArray(req.params.value))
                    try{
                      req.params.value = JSON.parse(req.params.value)
                    }
                    catch(e){
                      req.params.value = [req.params.value]
                    }

                  query = query.getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
                }

                debug_internals('default %o %o', req, app.options.table)


                /**
                * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
                **/
                let transformation = (req.query && req.query.transformation) ? req.query.transformation : undefined
                if(
                  transformation
                  && (transformation.orderBy
                    || (Array.isArray(transformation) && transformation.some(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy'}))
                  )
                ){
                  let orderBy = (transformation.orderBy) ? transformation.orderBy : transformation.filter(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy' })[0]//one orderBy
                  query = app.query_with_transformation(query, orderBy)

                  if(Array.isArray(transformation)){
                    transformation = Array.clone(transformation)
                    transformation.each(function(trasnform, index){
                      if(Object.keys(trasnform)[0] === 'orderBy')
                        transformation[index] = undefined
                    })

                    transformation = transformation.clean()
                  }


                }

                if(req.query && req.query.filter)
                  query = app.query_with_filter(query, req.query.filter)

                if(transformation)
                  query = app.query_with_transformation(query, transformation)
                /**
                * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
                **/

                // query = (req.params.path)
                // ? query
                //   .filter( app.r.row('metadata')('path').eq(req.params.path) )
                // : query
                let _result_callback = function(err, resp){
                  debug_internals('run', err)//resp
                  app.process_default(
                    err,
                    resp,
                    {
                      _extras: {
                        from: from,
                        type: (req.params && req.params.path) ? req.params.path : app.options.type,
                        id: (req.query && req.query.id) ? req.query.id : req.id,
                        transformation: (req.query.transformation) ? req.query.transformation : undefined,
                        aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
                        filter: (req.query.filter) ? req.query.filter : undefined
                        // prop: pluralize(index)
                      }
                    }
                  )
                }

                if (req.query && req.query.aggregation && !req.query.q) {
                  query =  this.result_with_aggregation(query, req.query.aggregation)
                  query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
                }
                else if(req.query.index === false){
                  query = app.build_query_fields(query, req.query)

                  debug('NO INDEX %o', query)

                  query.run(app.conn, {arrayLimit: 10000000}, _result_callback)

                }
                else{
                  if(req.query && (req.query.q || req.query.filter)){
                    query = query
                      .group( app.get_group(req.query.index) )
                      // .group( {index:'path'} )
                      .ungroup()
                      .map(
                        function (doc) {
                          // return app.build_default_query_result(doc, req.query)
                          return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
                        }
                      )
                      .run(app.conn, {arrayLimit: 10000000}, _result_callback)

                  }
                  else{
                    app.build_default_result_distinct(query, app.get_distinct(req.query.index), req.query.distinct, _result_callback)
                  }
                  // query = query
                  //   .group( app.r.row('metadata')('path') )
                  //   .ungroup()
                  //   .map(
                  //     function (doc) {
                  //         return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
                  //     }
                  // )
                }
              }



              debug('CONNECTED? %o %s', app.connected, app.options.db)
              if(app.connected === false){
                app.addEvent(app.ON_CONNECT, _default)
                // app.r.on('connect', function(err, conn){
                //   app.register(
                //     query,
                //     req,
                //     params
                //   )
                // })
              }
              else{
                _default()
              }

            } //req.query.register === false
					}
				},

        {
					register: function(req, next, app){
            // req = (req)
            // ? Object.clone(req)
            // : (app.options && app.options.register && app.options.register.req)
            //   ? Object.merge({ id: 'changes', params: {}, query: {}}, Object.clone(app.options.register.req))
            //   : { id: 'changes', params: {}, query: {} }
            req = (req)
            ? Object.clone(req)
            : (app.options && app.options.requests && app.options.requests.req)
              ? Object.merge({ params: {}, query: {}}, Object.clone(app.options.requests.req))
              : { params: {}, query: {} }

            if(req.id === 'changes'){

              if(app.options.type === 'minute'){
                req.query.filter = [
                  "r.row('metadata')('type').eq('periodical')"
                ]
              }
              else if(app.options.type === 'hour'){
                "r.row('metadata')('type').eq('minute')"
              }

              req.query.register = 'changes'


              // if(req.query.register || req.query.unregister){
                // process.exit(1)

                debug_internals('register %o %o', req, app.options);
                // process.exit(1)
                req.params = req.params || {}

                let from = req.from || app.options.table
                // from = (from === 'minute' || from === 'hour') ? 'historical' : from

                let query
                let params = {
                  _extras: {
                    from: from,
                    type: (req.params && req.params.path) ? req.params.path : app.options.type,
                    id: (req.query && req.query.id) ? req.query.id : req.id,
                    transformation: (req.query.transformation) ? req.query.transformation : undefined,
                    aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
                    filter: (req.query.filter) ? req.query.filter : undefined
                    // prop: pluralize(index)
                  }
                }

                if(req.query.register){
                  query = app.r
                    .db(app.options.db)
                    .table(from)

                  // query = (req.params.prop && req.params.value)
                  // ? query
                  //   .getAll(req.params.value , {index: pluralize(req.params.prop, 1)})
                  // : query
                  if(req.params.prop && req.params.value){
                    if(!Array.isArray(req.params.value))
                      try{
                        req.params.value = JSON.parse(req.params.value)
                      }
                      catch(e){
                        req.params.value = [req.params.value]
                      }

                    query = query.getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
                  }

                  if(req.query && req.query.filter)
                    query = app.query_with_filter(query, req.query.filter)

                  /**
                  * changes (feed)
                  **/
                  if(req.query.register === 'changes'){
                    delete app.options.changes.maxBatchSeconds
                    debug('app.options.changes', req.query.opts, app.options.changes)
                    // process.exit(1)
                    query = query.changes(req.query.opts || app.options.changes)
                    // query = query.changes({includeTypes: true, squash: false})
                  }
                    // query = query.changes({includeTypes: true, squash: false})

                  if(req.query && req.query.transformation)
                    query = app.query_with_transformation(query, req.query.transformation)

                  query = (req.params.path)
                  ? query
                    .filter( app.r.row('metadata')('path').eq(req.params.path) )
                  : query

                  /**
                  * changes (feed)
                  **/
                  if(req.query.register === 'changes' && req.query.q && typeof req.query.q !== 'string'){
                    debug_internals('register query.q', req.query);
                    query = this.build_query_fields(query, {q: [{new_val: req.query.q }, 'type']})
                  }


                  /**
                  * periodical
                  **/
                  if (req.query.register === 'periodical' && req.query.aggregation && !req.query.q) {
                    query =  this.result_with_aggregation(query, req.query.aggregation)
                  }
                  else if(req.query.register === 'periodical' && req.query.index === false){
                    query = app.build_query_fields(query, req.query)

                    debug('NO INDEX %o', query)

                  }
                  else if(req.query.register === 'periodical'){

                    if(req.query && req.query.q){
                      query = query
                        .group( app.get_group(req.query.index) )
                        // .group( {index:'path'} )
                        .ungroup()
                        .map(
                          function (doc) {
                            return app.build_default_query_result(doc, req.query)
                          }
                        )


                    }
                    else{
                      //Promise
                      // process.exit(1)
                      query = app.build_default_result_distinct(query,  app.get_distinct(req.query.index))
                    }
                  }

                  debug('CONNECTED? %o %s', app.connected, app.options.db)
                  if(app.connected === false){
                    app.addEvent(app.ON_CONNECT, function(){
                      app.register(
                        query,
                        req,
                        params
                      )
                    })
                    // app.r.on('connect', function(err, conn){
                    //   app.register(
                    //     query,
                    //     req,
                    //     params
                    //   )
                    // })
                  }
                  else{
                    app.register(
                      query,
                      req,
                      params
                    )
                  }
                }
                else{

                  app.unregister(
                    req,
                    params
                  )
                }

              // }//req.query.register === true
            }


					}
				},

      ],

      /**
      * periodical data always comes from 'periodical' table
      **/
      periodical: [
        // {
        //   /**
        //   * default query from mngr-ui-admin/libs/pipelines/input/rethinkdb
        //   **/
				// 	default: function(req, next, app){
        //     req = (req)
        //     ? Object.clone(req)
        //     : (app.options && app.options.requests && app.options.requests.req)
        //       ? Object.merge({ params: {}, query: {}}, Object.clone(app.options.requests.req))
        //       : { params: {}, query: {} }
        //
        //     // if(req.id === 'periodical'){
        //
        //       let _default = function(){
        //         debug_internals('default PERIODICAL %o %o', req, app.options.table)
        //
        //         app.options.full_range = app.options.full_range || false
        //
        //         app.fireEvent('onSuspend')
        //
        //         req = (req) ? Object.clone(req) : { id: 'paths', params: {}, query: {} }
        //
        //         let from = req.from || app.options.table
        //
        //
        //         let query = app.r
        //           .db(app.options.db)
        //           .table(from)
        //
        //         // query = (req.params.prop && req.params.value)
        //         // ? query
        //         //   .getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
        //         // : query
        //         if(req.params.prop && req.params.value){
        //           if(!Array.isArray(req.params.value))
        //             try{
        //               req.params.value = JSON.parse(req.params.value)
        //             }
        //             catch(e){
        //               req.params.value = [req.params.value]
        //             }
        //
        //           query = query.getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
        //         }
        //
        //         debug_internals('default %o %o', req, app.options.table)
        //
        //
        //         /**
        //         * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
        //         **/
        //         let transformation = (req.query && req.query.transformation) ? req.query.transformation : undefined
        //         if(
        //           transformation
        //           && (transformation.orderBy
        //             || (Array.isArray(transformation) && transformation.some(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy'}))
        //           )
        //         ){
        //           let orderBy = (transformation.orderBy) ? transformation.orderBy : transformation.filter(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy' })[0]//one orderBy
        //           query = app.query_with_transformation(query, orderBy)
        //
        //           if(Array.isArray(transformation)){
        //             transformation = Array.clone(transformation)
        //             transformation.each(function(trasnform, index){
        //               if(Object.keys(trasnform)[0] === 'orderBy')
        //                 transformation[index] = undefined
        //             })
        //
        //             transformation = transformation.clean()
        //           }
        //
        //
        //         }
        //
        //         if(req.query && req.query.filter)
        //           query = app.query_with_filter(query, req.query.filter)
        //
        //         if(transformation)
        //           query = app.query_with_transformation(query, transformation)
        //         /**
        //         * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
        //         **/
        //
        //         // query = (req.params.path)
        //         // ? query
        //         //   .filter( app.r.row('metadata')('path').eq(req.params.path) )
        //         // : query
        //         let _result_callback = function(err, resp){
        //           debug_internals('run', err)//resp
        //           app.fireEvent('onResume')
        //           app.process_default(
        //             err,
        //             resp,
        //             {
        //               _extras: {
        //                 from: from,
        //                 type: (req.params && req.params.path) ? req.params.path : app.options.type,
        //                 id: req.id,
        //                 transformation: (req.query.transformation) ? req.query.transformation : undefined,
        //                 aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
        //                 filter: (req.query.filter) ? req.query.filter : undefined
        //                 // prop: pluralize(index)
        //               }
        //             }
        //           )
        //         }
        //
        //         /**
        //         * if no params, exec grouping query
        //         **/
        //         if(req.id === 'paths'){
        //         }
        //         else{
        //           if(app.options.full_range === false){
        //             if(app.options.type === 'minute'){
        //               query = query
        //                 .between(
        //                   roundSeconds(Date.now() - MINUTE),
        //                   roundSeconds(Date.now()),
        //                   {index: 'timestamp'}
        //                 )
        //             }
        //             else{
        //               query = query
        //                 .between(
        //                   roundMinutes(Date.now() - HOUR),
        //                   roundMinutes(Date.now()),
        //                   /**
        //                   * testing ML
        //                   **/
        //                   // Date.now() - HOUR,
        //                   // Date.now(),
        //                   // Date.now(),
        //                   {index: 'timestamp'}
        //                 )
        //             }
        //
        //           }
        //
        //           if (req.query && req.query.aggregation && !req.query.q) {
        //             query =  this.result_with_aggregation(query, req.query.aggregation)
        //             query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //           }
        //           else if(req.query.index === false){
        //             query = app.build_query_fields(query, req.query)
        //
        //             debug('NO INDEX %o', query)
        //
        //             query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //
        //           }
        //           else{
        //             if(req.query && (req.query.q || req.query.filter)){
        //               query = query
        //                 .group( app.get_group(req.query.index) )
        //                 // .group( {index:'path'} )
        //                 .ungroup()
        //                 .map(
        //                   function (doc) {
        //                     // return app.build_default_query_result(doc, req.query)
        //                     return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
        //                   }
        //                 )
        //                 .run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //
        //             }
        //             else{
        //               let _add_range = function(query){
        //
        //               }
        //               app.build_default_result_distinct(query, app.get_distinct(req.query.index), req.query.distinct, _result_callback)
        //             }
        //
        //           }
        //         }
        //
        //       }
        //
        //
        //
        //       debug('CONNECTED? %o %s', app.connected, app.options.db)
        //       if(app.connected === false){
        //         app.addEvent(app.ON_CONNECT, _default)
        //         // app.r.on('connect', function(err, conn){
        //         //   app.register(
        //         //     query,
        //         //     req,
        //         //     params
        //         //   )
        //         // })
        //       }
        //       else{
        //         _default()
        //       }
        //
        //     // } //req.query.register === false
				// 	}
				// },

        {
          default: function(req, next, app){
            req = (req)
            ? Object.clone(req)
            : (app.options && app.options.requests && app.options.requests.req)
              ? Object.merge({ params: {}, query: {}}, Object.clone(app.options.requests.req))
              : { params: {}, query: {} }

            debug('PERRIODICAL %o %o', req, app.options.requests)
            if(req.id === 'periodical'){
              const _default = function(){


                  app.options.full_range = app.options.full_range || false

                  app.fireEvent('onSuspend')

                  req = (req) ? Object.clone(req) : { id: 'paths', params: {}, query: {} }

                  let from = req.from || app.options.table


                  let query = app.r
                    .db(app.options.db)
                    .table(from)


                  let _result_callback = function(err, resp){
                    debug_internals('run', err)//resp
                    app.fireEvent('onResume')
                    app.process_default(
                      err,
                      resp,
                      {
                        _extras: {
                          from: from,
                          type: (req.params && req.params.path) ? req.params.path : app.options.type,
                          id: (req.query && req.query.id) ? req.query.id : req.id,
                          transformation: (req.query.transformation) ? req.query.transformation : undefined,
                          aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
                          filter: (req.query.filter) ? req.query.filter : undefined
                          // prop: pluralize(index)
                        }
                      }
                    )
                  }
                  /**
                  * if no params, exec grouping query
                  **/
                  // if(req.id === 'paths'){
                  if(app.options.full_range === false){
                    let distinct_query = query.distinct({index: 'path'})

                    // if(app.options.full_range === false){
                      if(app.options.type === 'periodical' || app.options.type === 'minute'){
                        query = query
                        .between(
                          roundSeconds(Date.now() - MINUTE),
                          roundSeconds(Date.now()),
                          {index: 'timestamp'}
                        )
                      }
                      else if(app.options.type === 'hour'){
                        query = query
                        .between(
                          roundMinutes(Date.now() - HOUR),
                          roundMinutes(Date.now()),
                          /**
                          * testing ML
                          **/
                          // Date.now() - HOUR,
                          // Date.now(),
                          {index: 'timestamp'}
                        )
                      }
                      else if(app.options.type === 'day'){
                        query = query
                        .between(
                          roundHours(Date.now() - DAY),
                          roundHours(Date.now()),
                          /**
                          * testing ML
                          **/
                          // Date.now() - DAY,
                          // Date.now(),
                          {index: 'timestamp'}
                        )
                      }

                    // }

                    distinct_query.run(app.conn, {arrayLimit: 10000000}, function(err, resp){
                      if(err){
                        _result_callback(err, undefined)
                      }
                      else{
                        let _groups = {}
                        resp.toArray(function(err, paths){
                          if(err){
                            _result_callback(err, undefined)
                          }
                          else{
                            async.eachOf(paths, function (path, index, _async_callback) {
                              if(!_groups[path]) _groups[path] = {}

                              _groups[path].path = path

                              try{
                                app.r.expr([
                                  query
                                  .filter(app.r.row('metadata')('path').eq(path))('metadata')('host')
                                  .distinct(),
                                  query
                                  .filter(app.r.row('metadata')('path').eq(path))('metadata')('timestamp').min(),
                                  query
                                  .filter(app.r.row('metadata')('path').eq(path))('metadata')('timestamp').max(),

                                ]).run(app.conn, {arrayLimit: 1000000}, function(err, resp){
                                  debug('EXPR RESULT %o %o', err, resp)
                                  // process.exit(1)
                                  if(resp && Array.isArray(resp)){
                                    _groups[path].range =[ resp[1], resp[2] ]
                                    _groups[path].hosts = resp[0]
                                  }
                                  // _async_callback(err, _groups)
                                  _async_callback(undefined, _groups)
                                  // rowFinished(err)
                                })
                              }
                              catch(err){
                                // _async_callback(err, _groups)
                                _async_callback(undefined, _groups)
                              }


                            }, function (err) {
                              debug('build_default_result ERR %o', err)
                              // if(err){
                              //   _result_callback(err, undefined)
                              // }
                              // else{
                              _result_callback(err, _groups)
                              // }
                            // process.exit(1)
                            })
                          }
                        })

                      }
                    })



                  }
                  /**
                  * process query (same as default)
                  **/
                  else{
                    // if(app.options.full_range === false){
                    //   if(app.options.type === 'minute'){
                    //     query = query
                    //       .between(
                    //         roundSeconds(Date.now() - MINUTE),
                    //         roundSeconds(Date.now()),
                    //         {index: 'timestamp'}
                    //       )
                    //   }
                    //   else{
                    //     query = query
                    //       .between(
                    //         roundMinutes(Date.now() - HOUR),
                    //         roundMinutes(Date.now()),
                    //         /**
                    //         * testing ML
                    //         **/
                    //         // Date.now() - HOUR,
                    //         // Date.now(),
                    //         // Date.now(),
                    //         {index: 'timestamp'}
                    //       )
                    //   }
                    //
                    // }
                    // debug('FULL RANGE %o', app.options.full_range, req)
                    // process.exit(1)


                    // query = (req.params.prop && req.params.value)
                    // ? query
                    //   .getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
                    // : query
                    if(req.params.prop && req.params.value){
                      if(!Array.isArray(req.params.value))
                        try{
                          req.params.value = JSON.parse(req.params.value)
                        }
                        catch(e){
                          req.params.value = [req.params.value]
                        }

                      query = query.getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
                    }

                    debug_internals('default %o %o', req, app.options.table)

                    /**
                    * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
                    **/
                    let transformation = (req.query && req.query.transformation) ? req.query.transformation : undefined

                    // debug('FULL RANGE %o', app.options.full_range, req, transformation, query)
                    // process.exit(1)
                    if(
                      transformation
                      && (transformation.orderBy
                        || (Array.isArray(transformation) && transformation.some(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy'}))
                      )
                    ){
                      let orderBy = (transformation.orderBy) ? transformation.orderBy : transformation.filter(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy' })[0]//one orderBy
                      query = app.query_with_transformation(query, orderBy)

                      if(Array.isArray(transformation)){
                        transformation = Array.clone(transformation)
                        transformation.each(function(trasnform, index){
                          if(Object.keys(trasnform)[0] === 'orderBy')
                            transformation[index] = undefined
                        })

                        transformation = transformation.clean()
                      }


                    }

                    if(req.query && req.query.filter)
                      query = app.query_with_filter(query, req.query.filter)

                    if(transformation)
                      query = app.query_with_transformation(query, transformation)
                    /**
                    * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
                    **/



                    if (req.query && req.query.aggregation && !req.query.q) {
                      query =  this.result_with_aggregation(query, req.query.aggregation)
                      query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
                    }
                    else if(req.query.index === false){
                      query = app.build_query_fields(query, req.query)

                      debug('NO INDEX %o', query)

                      query.run(app.conn, {arrayLimit: 10000000}, _result_callback)

                    }
                    else{
                      if(req.query && (req.query.q || req.query.filter)){
                        query = query
                          .group( app.get_group(req.query.index) )
                          // .group( {index:'path'} )
                          .ungroup()
                          .map(
                            function (doc) {
                              // return app.build_default_query_result(doc, req.query)
                              return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
                            }
                          )
                          .run(app.conn, {arrayLimit: 10000000}, _result_callback)

                      }
                      else{
                        app.build_default_result_distinct(query, app.get_distinct(req.query.index), _result_callback)
                      }
                      // query = query
                      //   .group( app.r.row('metadata')('path') )
                      //   .ungroup()
                      //   .map(
                      //     function (doc) {
                      //         return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
                      //     }
                      // )
                    }
                  }

              }


              debug('CONNECTED? %o %s', app.connected, app.options.db)
              if(app.connected === false){
                app.addEvent(app.ON_CONNECT, _default)
                // app.r.on('connect', function(err, conn){
                //   app.register(
                //     query,
                //     req,
                //     params
                //   )
                // })
              }
              else{
                _default()
              }


            }


					}
				},

				// 	default: function(req, next, app){
        //     req = (req) ? Object.clone(req) : { id: 'default', params: {}, query: {} }
        //     // if(!req.query || (!req.query.register && !req.query.unregister)){
        //
        //
        //       // let distinct_indexes = (req.params && req.params.prop ) ? pluralize(req.params.prop, 1) : app.distinct_indexes
        //       // if(!Array.isArray(distinct_indexes))
        //       //   distinct_indexes = [distinct_indexes]
        //       //
        //       // debug_internals('property', distinct_indexes);
        //
        //       let from = req.from || app.options.table
        //
        //
        //       let query = app.r
        //         .db(app.options.db)
        //         .table(from)
        //
        //       // query = (req.params.prop && req.params.value)
        //       // ? query
        //       //   .getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
        //       // : query
        //       if(req.params.prop && req.params.value){
        //         if(!Array.isArray(req.params.value))
        //           try{
        //             req.params.value = JSON.parse(req.params.value)
        //           }
        //           catch(e){
        //             req.params.value = [req.params.value]
        //           }
        //
        //         query = query.getAll(app.r.args(req.params.value) , {index: pluralize(req.params.prop, 1)})
        //       }
        //
        //       debug_internals('default %o %o', req, app.options.table)
        //
        //
        //       /**
        //       * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
        //       **/
        //       let transformation = (req.query && req.query.transformation) ? req.query.transformation : undefined
        //       if(
        //         transformation
        //         && (transformation.orderBy
        //           || (Array.isArray(transformation) && transformation.some(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy'}))
        //         )
        //       ){
        //         let orderBy = (transformation.orderBy) ? transformation.orderBy : transformation.filter(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy' })[0]//one orderBy
        //         query = app.query_with_transformation(query, orderBy)
        //
        //         if(Array.isArray(transformation)){
        //           transformation = Array.clone(transformation)
        //           transformation.each(function(trasnform, index){
        //             if(Object.keys(trasnform)[0] === 'orderBy')
        //               transformation[index] = undefined
        //           })
        //
        //           transformation = transformation.clean()
        //         }
        //
        //
        //       }
        //
        //       if(req.query && req.query.filter)
        //         query = app.query_with_filter(query, req.query.filter)
        //
        //       if(transformation)
        //         query = app.query_with_transformation(query, transformation)
        //       /**
        //       * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
        //       **/
        //
        //       // query = (req.params.path)
        //       // ? query
        //       //   .filter( app.r.row('metadata')('path').eq(req.params.path) )
        //       // : query
        //
        //       let _result_callback = function(err, resp){
        //         debug_internals('run', err)//resp
        //         app.process_default(
        //           err,
        //           resp,
        //           {
        //             _extras: {
        //               from: from,
        //               type: (req.params && req.params.path) ? req.params.path : app.options.type,
        //               id: req.id,
        //               transformation: (req.query.transformation) ? req.query.transformation : undefined,
        //               aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
        //               filter: (req.query.filter) ? req.query.filter : undefined
        //               // prop: pluralize(index)
        //             }
        //           }
        //         )
        //       }
        //
        //       if (req.query && req.query.aggregation && !req.query.q) {
        //         query =  this.result_with_aggregation(query, req.query.aggregation)
        //         query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //       }
        //       else if(req.query.index === false){
        //         query = app.build_query_fields(query, req.query)
        //
        //         debug('NO INDEX %o', query)
        //
        //         query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //
        //       }
        //       else{
        //         // if(req.query && req.query.q){
        //         if(req.query && req.query.q){
        //           query = query
        //             .group( app.get_group(req.query.index) )
        //             // .group( {index:'path'} )
        //             .ungroup()
        //             .map(
        //               function (doc) {
        //                 return app.build_default_query_result(doc, req.query)
        //                 // return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
        //               }
        //             )
        //             .run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //
        //         }
        //         else{
        //           app.build_default_result_distinct(query, app.get_distinct(req.query.index), _result_callback)
        //         }
        //           // query = query
        //           //   .group( app.r.row('metadata')('path') )
        //           //   // .group( {index:'path'} )
        //           //   .ungroup()
        //           //   .map(
        //           //     function (doc) {
        //           //       return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
        //           //     }
        //           //   )
        //           //   .run(app.conn, {arrayLimit: 10000000}, _result_callback)
        //
        //         // }
        //         // else{
        //         //   app.build_default_result(query, _result_callback)
        //         // }
        //         // query = query
        //         //   .group( app.r.row('metadata')('path') )
        //         //   .ungroup()
        //         //   .map(
        //         //     function (doc) {
        //         //         return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc)
        //         //     }
        //         // )
        //       }
        //
        //       // query.run(app.conn, {arrayLimit: 10000000}, function(err, resp){
        //       //   debug_internals('run', err)//resp
        //       //   app.process_default(
        //       //     err,
        //       //     resp,
        //       //     {
        //       //       _extras: {
        //       //         from: from,
        //       //         type: (req.params && req.params.path) ? req.params.path : app.options.type,
        //       //         id: req.id,
        //       //         transformation: (req.query.transformation) ? req.query.transformation : undefined,
        //       //         aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
        //       //         filter: (req.query.filter) ? req.query.filter : undefined
        //       //         // prop: pluralize(index)
        //       //       }
        //       //     }
        //       //   )
        //       // })
        //
        //     // } //req.query.register === false
				// 	}
				// },
        // {
				// 	default: function(req, next, app){
        //     // req = (req) ? Object.clone(req) : {}
        //     debug_internals('periodical default %s', new Date());
        //
        //     // if(!req.query || (!req.query.register && !req.query.unregister)){
        //     if(Object.getLength(app.periodicals) > 0){
        //       // debug_internals('periodical default %O', app.periodicals);
        //
        //       Object.each(app.periodicals, function(periodical_req, uuid){
        //         Object.each(periodical_req, function(periodical, id){
        //           let {query, params} = periodical
        //           debug_internals('periodical default %s %O', id, periodical);
        //           // periodical_req.id = id
        //           query.run(app.conn, {arrayLimit: 10000000}, function(err, resp){
        //             debug_internals('periodical default run', err, resp)//resp
        //             app.process_default(
        //               err,
        //               resp,
        //               params
        //             )
        //           })
        //         }.bind(this))
        //       }.bind(this))
        //
        //
        //     } //req.query.register === false
				// 	}
				// },
      ],

      range: [
        {
					default: function(req, next, app){
            req = (req) ? Object.clone(req) : {}

						debug_internals('default range', req);
            // process.exit(1)
            if(!req.query || (!req.query.register && !req.query.unregister)){

              let start, end
              end = (req.opt && req.opt.range) ? req.opt.range.end : Date.now()
              start  = (req.opt && req.opt.range) ? req.opt.range.start : end - 10000 //10 secs

              let range = 'posix '+start+'-'+end+'/*'


              let from = req.from || app.options.table
              // from = (from === 'minute' || from === 'hour') ? 'historical' : from

              let index = "timestamp"

              let query = app.r
                .db(app.options.db)
                .table(from)

              index = (req.params.prop && req.params.value)
              ? pluralize(req.params.prop, 1)+'.timestamp'
              : index

              start = (req.params.prop && req.params.value)
              ? [req.params.value, start]
              : start

              end = (req.params.prop && req.params.value)
              ? [req.params.value, end]
              : end

              query = (req.params.path)
              ? query
                .between(
                  start,
                  end,
                  {index: index}
                )
                .filter( app.r.row('metadata')('path').eq(req.params.path) )
              : query
                .between(
                  start,
                  end,
                  {index: index}
                )



              /**
              * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
              **/
              let transformation = (req.query && req.query.transformation) ? req.query.transformation : undefined
              if(
                transformation
                && (transformation.orderBy
                  || (Array.isArray(transformation) && transformation.some(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy'}))
                )
              ){
                let orderBy = (transformation.orderBy) ? transformation.orderBy : transformation.filter(function(trasnform){ return Object.keys(trasnform)[0] === 'orderBy' })[0]//one orderBy
                query = app.query_with_transformation(query, orderBy)

                if(Array.isArray(transformation)){
                  transformation = Array.clone(transformation)
                  transformation.each(function(trasnform, index){
                    if(Object.keys(trasnform)[0] === 'orderBy')
                      transformation[index] = undefined
                  })

                  transformation = transformation.clean()
                }


              }

              if(req.query && req.query.filter)
                query = app.query_with_filter(query, req.query.filter)

              if(transformation)
                query = app.query_with_transformation(query, transformation)
              /**
              * orderBy need to be called before filters (its order table), other trasnform like "slice" are run after "filters"
              **/

              query.delete().run(app.conn, {durability: "hard"}, function(err, resp){
                debug_internals('run %o %o', err, resp) //resp
                app.process_default(
                  err,
                  resp,
                  {
                    _extras: {
                      from: from,
                      type: (req.params && req.params.path) ? req.params.path : app.options.type,
                      id: req.id,
                      Range: range,
                      range: req.opt.range,
                      transformation: (req.query.transformation) ? req.query.transformation : undefined,
                      aggregation: (req.query.aggregation) ? req.query.aggregation : undefined
                      // prop: pluralize(index)
                    }
                  }
                )
              })

              // if (req.query && req.query.aggregation && !req.query.q) {
              //   query =  this.result_with_aggregation(query, req.query.aggregation)
              //
              //   // query.run(app.conn, {arrayLimit: 10000000}, _result_callback)
              // }
              // else if(req.query.index === false){
              //   query = app.build_query_fields(query, req.query)
              //
              //   debug('NO INDEX %o', query)
              // }
              // else{
              //   query = query
              //     .group(app.get_group(req.query.index))
              //     .ungroup()
              //     .map(
              //       function (doc) {
              //         // return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result_between(doc)
              //         return (req.query && req.query.q) ? app.build_default_query_result(doc, req.query) : app.build_default_result(doc, (req.query.index) ? req.query.index : 'path')
              //       }
              //   )
              // }
              //
              // query.run(app.conn, {arrayLimit: 10000000}, function(err, resp){
              //   debug_internals('run', err) //resp
              //   app.process_default(
              //     err,
              //     resp,
              //     {
              //       _extras: {
              //         from: from,
              //         type: (req.params && req.params.path) ? req.params.path : app.options.type,
              //         id: (req.query && req.query.id) ? req.query.id : req.id,
              //         Range: range,
              //         range: req.opt.range,
              //         transformation: (req.query.transformation) ? req.query.transformation : undefined,
              //         aggregation: (req.query.aggregation) ? req.query.aggregation : undefined,
              //         filter: (req.query.filter) ? req.query.filter : undefined
              //         // prop: pluralize(index)
              //       }
              //     }
              //   )
              // })

            }

					}
				},


      ]

		},

		routes: {

      // distinct: [{
      //   path: ':database/:table',
      //   callbacks: ['distinct']
      // }],
      // distinct: [{
      //   path: ':database/:table',
      //   callbacks: ['distinct']
      // }],
      // nth: [{
      //   path: ':database/:table',
      //   callbacks: ['range']
      // }],
      // changes: [{
      //   // path: ':database/:table',
      //   path: '',
      //   callbacks: ['changes']
      // }],

		},


  },

  process_default: function(err, resp, params, error_on_doc){
    this.parent(err, resp, params, true)
  }




});
