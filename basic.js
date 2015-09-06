'use strict'

module.exports = function MservAuthBasicPlugin(service, options) {

	let handler = options.handler

	return function*(data, options) {

		try {
			let str   = Buffer(data, 'base64').toString(options.encoding || 'utf8'),
				parts = str.split(':')

			if (handler && parts.length >= 2) 
				return yield handler.apply(this, parts)
			
			return null
		}
		catch(err) {
			console.log(err.stack)
			return null
		}
	}
}