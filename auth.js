'use strict'

var _ = require('lodash')

module.exports = function(service, globalOptions) {


	let schemes = {}

	// Allows us to register authentication schemes with the middleware 
	// the same way we register middleware with the service. Auth plugins
	// should be implemented like middleware except that the function 
	// don't need to yield to `next`. They should return credentials or null. 
	// Credentials should be an object with at least a `scope` key whose value 
	// is a string or an array of strings.

	service.extend('auth', function(service) {
		return function(scheme, plugin, options) {
			schemes[scheme] = plugin(service, options || {})
		}
	})

	// Unauthorized should be a plain function returning a response or throwing. 
	// The result is assigned to this.res if it does not throw. 

	let unauthorized = globalOptions.unauthorized || function(code, scheme) {
		
		let status = 'Unauthorized',
			challenge = _.capitalize(Object.keys(schemes)[0])
		
		switch(code) {
			case 400: status = 'Bad Request';  break;
			case 401: status = 'Unauthorized'; break;
			case 403: status = 'Forbidden';    break;
		}

		let err = new Error(status)
		err.source = 'mserv-auth'
		err.status = status
		err.code   = code
		err['WWW-Authenticate'] = (scheme === undefined) && _.capitalize(scheme) || challenge

		throw err
	}



	return function*(next, options) {

		// If options is actually a boolean then create the appropriate options
		if (typeof options === 'boolean')
			options = options ?	{scheme: Object.keys(schemes)} : {scheme:false}

		// If options is a string or an array we assume that it's the scope
		if (typeof options === 'string' || Array.isArray(options))
			options = {scope: options}

		// Combine options with default options
		options = _.defaults(options || {}, globalOptions || {})


		// Which schemes are allowed for this action? basic, bearer, apikey...
		let actionSchemes = options.scheme,
			actionScope   = options.scope

		// Normalize schemes and scope
		if (actionSchemes && typeof actionSchemes === 'string')
			actionSchemes = [actionSchemes]

		if (actionScope && typeof actionScope === 'string')
			actionScope = [actionScope]

		// If we have no schemes but we have a scope then we assume that any scheme is fine.
		if (!actionSchemes && actionScope)
			actionSchemes = Object.keys(schemes)


		// Proceed only if authentication is required
		if (actionSchemes) {

			// Check that we have an authorization header
			if (!this.headers$.authorization)
				return this.res = unauthorized(401)

			// Get the authorization header (same format as an HTTP authorization header)
			// It's origin will often be an HTTP request of some kind.
			let header = this.headers$.authorization,
				parts  = header.split(/\s+/),
				scheme = parts[0].toLowerCase(),
				data   = parts[1],
				credentials

			// Get the plugin for that scheme and make sure it's a function
			let plugin = schemes[scheme]
			if (!plugin || typeof plugin !== 'function')
				return this.res = unauthorized(401)


			credentials = yield plugin(data, options)

			// Call the plugin to handle the details
			if (!credentials)
				return this.res = unauthorized(401,scheme)

			// If the action specifies a scope then apply it
			if (actionScope && actionScope.length > 0) {
		
				// If the credentials have no scope then boom!
				if (!credentials.scope)
					return this.res = unauthorized(403, scheme)

				// Normalize the credentials scope to an array
				if (! Array.isArray(credentials.scope))
					credentials.scope = [credentials.scope]

				// If any of the users scopes match the scopes of the action then it a GO
				if (_.intersection(actionScope, credentials.scope).length === 0)
					return this.res = unauthorized(403, scheme)
			}

			this.auth$ = {credentials}
		}

		yield next
	}
}
