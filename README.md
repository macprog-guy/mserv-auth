# Introduction
mserv-auth is [mserv](https://github.com/macprog-guy/mserv) middleware that allows microservice level authentication and authorization. It works along the same lines as HTTP authentication and uses scope based authorization. It's also an mserv extension that allows for any type of authentication scheme. It comes with HTTP Basic authentication and custom authentication built-in.


# Installation

	$ npm i --save mserv-auth

# Usage

```js

var mserv   = require('mserv'),
	auth    = require('mserv-auth'),
	helpers = require('mserv-auth/helpers'),
	basic   = require('mserv-auth/basic'),
	custom  = require('mserv-auth/custom')

var service = mserv().use('auth', auth)
	
service.ext.auth('basic', basic, {
	handler: function*(username, password) {
		if (username === 'foo' && password === 'bar')
			return {scope:'root'}
		return null
	}
})

service.ext.auth('apikey', custom, {
	handler: function*(apikey) {
		if (apikey === '12345678')
			return {scope:'root'}
		return null
	}
})

service.invoke('some-action', args, helpers.authorization('Basic', 'foo', 'bar'))

```

# Algorithm

- If action requires authentication then
	- Look for an an `authorization` key in the message headers (`this.headers$`).
	- return `unauthorized` If not found 
	- `[scheme, data] = authorization.split(/\s+/)`
	- return `notImplemented` if scheme not in available schemes
	- return `unauthorized` If scheme not in allowed schemes
	- `handler = schemeHandlers[scheme]`
	- return `notImplemented` if handler not found
	- `credentials = yield handler(data, actionOptions)`
	- return `unauthorized` if no credentials
	- if action specifies one or more scopes
		- return `unauthorized` if credentials have no scopes
		- return `unauthorized` if intersection of scopes is empty

- yield next

# Basic Authentication

Basic authentication works exactly like HTTP basic authentication. In fact you can forward an HTTP authorization header to mserv-auth and it will work as expected. All that is required is the actual
implementation. For example:

```js
service.ext.auth('basic', basic, {
	handler: function*(username, password) {
		return yield postgres.any('select * from users where username=$1 and encrypted_password=crypt(p_password, encrypted_password))')
	}
})
```



# Custom Authentication
Custom authentication simply passes the raw data to the handler (without the scheme prefix).
This is perfect for apikey authentication:

```js
service.ext.auth('apikey', custom, {
	handler: function*(apikey) {
		return yield postgres.any('select credentials from apikeys where id=$1', apikey)
	}
})
```


