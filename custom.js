'use strict'

module.exports = function MservAuthCustomPlugin(service, options) {

	let handler = options && options.handler

	return function*(data, options) {
		return handler? yield handler(data) : null
	}
}