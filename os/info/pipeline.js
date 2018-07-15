'use stric'

var debug = require('debug')('filter:os');
var debug_internals = require('debug')('filter:os:Internals');

const path = require('path');

var procs_filter = require('./filters/proc'),
    sanitize_filter = require(path.join(process.cwd(), '/devel/etc/snippets/filter.sanitize.template'))

module.exports = {
 input: [
	{
		poll: {
			id: "input.os.http",
			conn: [
				{
					scheme: 'http',
					host:'127.0.0.1',
					port: 8081,
					module: require(path.join(process.cwd(), 'lib/pipeline/input/poller/poll/http')),
					// load: ['apps/info/os/']
          load: ['apps/os/info/os/']
				}
			],
			requests: {
				periodical: 1000,
			},
		},
	}
 ],
 filters: [
		// require('./snippets/filter.sanitize.template'),
    function(doc, opts, next, pipeline){
      let { type, input, input_type, app } = opts

      // let save = function(save_doc){
      //   if(Array.isArray(save_doc)){
      //     this.fireEvent(this.ON_SAVE_MULTIPLE_DOCS, [save_doc]);
      //   }
      //   else{
      //     this.fireEvent(this.ON_SAVE_DOC, save_doc);
      //   }
      //   //this.fireEvent(this.ON_SAVE_DOC, save_doc);
      // }.bind(pipeline)

      if(app.options.id == 'os.procs'){
        procs_filter(doc, opts, sanitize_filter, pipeline)
      }
      else{
        debug_internals('os doc', doc)

        sanitize_filter(
          doc,
          opts,
          pipeline.output.bind(pipeline),
          pipeline
        )
      }


    },

	],
	output: [
    // require(path.join(process.cwd(), '/devel/etc/snippets/output.stdout.template')),
		//require('./snippets/output.stdout.template'),
		{
			cradle: {
				id: "output.os.cradle",
				conn: [
					{
						host: 'elk',
						port: 5984,
						db: 'dashboard',
						opts: {
							cache: true,
							raw: false,
							forceSave: true,
						},
					},
				],
				module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
        buffer:{
					size: 0,
					expire:0
				}
			}
		}
	]
}
