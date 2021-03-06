'use strict'

var auth    = require('.'),
	mserv   = require('mserv'),
	helpers = require('./helpers'),
	custom  = require('./custom'),
	basic   = require('./basic'),
	co      = require('co'),
	chai    = require('chai'),
	should  = chai.should(),
	_       = require('lodash')


// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function wrappedTest(generatorFunc) {
	return function(done) {
		try {
			co(generatorFunc)
			.then(
				function()   { done()    },
				function(err){ done(err) }
			)
		}
		catch(err) {
			done(err)
		}
	}
}




// ----------------------------------------------------------------------------
// Custom
// ----------------------------------------------------------------------------

describe("mserv-auth/custom", function(){

	let credentials = null

	beforeEach(function(done){
		credentials = null
		done()
	})


	let service = mserv({amqp:false})
	.use('auth',auth)
	.action({
		name: 'public',
		auth: false,
		handler: function*(data, options) {
			return 'ok'
		}
	})

	.action({
		name: 'private',
		auth: true,
		handler: function*(data, options) {
			return 'ok'
		}
	})

	.action({
		name: 'private-root',
		auth: 'root',
		handler: function*(data, options) {
			return 'ok'
		}
	})

	.action({
		name: 'private-delegate',
		auth: ['root','delegate'],
		handler: function*(data, options) {
			return 'ok'
		}
	})

	.action({
		name: 'schemeNotImplemented',
		auth: {	scheme:'foo' },
		handler: function*(data, options) {
			return 'ok'
		}
	})


	service.ext.auth('test', custom, {
		handler: function*(data, options) {
			return credentials
		}
	})



	it('should execute the action and return ok', wrappedTest(function*(){
		let result = yield service.invoke('public')
		result.should.equal('ok')
	}))


	it('should not execute the action and return notSpecified', wrappedTest(function*(){
		try {
			yield service.invoke('private')
			throw new Error('mserv-auth did not throw')
		}
		catch(err) {
			if (err.message === 'mserv-auth did not throw')
				throw err

			_.pick(err, 'name','message','status','code','WWW-Authenticate').should.eql({
				name:'Error',
				message:'Unauthorized',
				status: 'Unauthorized',
				code: 401,
				'WWW-Authenticate': 'Test'
			})
		}
	}))


	it('should not execute the action and return schemeNotImplemented', wrappedTest(function*(){
		try {
			yield service.invoke('schemeNotImplemented',{}, helpers.authorization('Foo','toto'))
			throw new Error('mserv-auth did not throw')
		}
		catch(err) {
			if (err.message === 'mserv-auth did not throw')
				throw err

			_.pick(err, 'name','message','status','code','WWW-Authenticate').should.eql({
				name:'Error',
				message:'Unauthorized',
				status: 'Unauthorized',
				code: 401,
				'WWW-Authenticate': 'Test'
			})
		}
	}))


	it('should not execute the action and return unauthorized', wrappedTest(function*(){
		try {
			yield service.invoke('private',{},helpers.authorization('Test'))
			throw new Error('mserv-auth did not throw')
		}
		catch(err) {
			if (err.message === 'mserv-auth did not throw')
				throw err

			_.pick(err, 'name','message','status','code','WWW-Authenticate').should.eql({
				name:'Error',
				message:'Unauthorized',
				status: 'Unauthorized',
				code: 401,
				'WWW-Authenticate': 'Test'
			})
		}
	}))


	it('should execute the action and return ok', wrappedTest(function*(){
		credentials = {scope:'root'}
		let result = yield service.invoke('private',{},helpers.authorization('Test'))
		result.should.eql('ok')
	}))


	it('should execute the action and return ok', wrappedTest(function*(){
		credentials = {scope:'root'}
		let result = yield service.invoke('private-root',{},helpers.authorization('Test'))
		result.should.eql('ok')
	}))


	it('should execute the action and return ok', wrappedTest(function*(){
		credentials = {scope:'delegate'}
		let result = yield service.invoke('private',{},helpers.authorization('Test'))
		result.should.eql('ok')
	}))


	it('should execute the action and return ok', wrappedTest(function*(){
		credentials = {scope:['root','delegate']}
		let result = yield service.invoke('private-delegate',{},helpers.authorization('Test'))
		result.should.eql('ok')
	}))
})


// ----------------------------------------------------------------------------
// Basic
// ----------------------------------------------------------------------------

describe("mserv-auth/basic", function(){


	let service = mserv({amqp:false})
		.use('auth',auth)
		.action({
			name: 'private',
			auth: true,
			handler: function*(data, options) {
				return 'ok'
			}
		})

	service.ext.auth('basic', basic, {
		handler: function*(username, password) {
			if (username === 'eric' && password === 'secret') 
				return {scope:'root'}
			return null
		}
	})


	it('should execute the action and return ok', wrappedTest(function*(){
		let result = yield service.invoke('private',null, helpers.authorization('Basic','eric','secret'))
		result.should.equal('ok')
	}))


	it('should not execute the action and return unauthorized', wrappedTest(function*(){
		let headers = helpers.authorization('Basic','eric','wrong')
		try {
			yield service.invoke('private',null, headers)
			throw new Error('mserv-auth did not throw')
		}
		catch(err) {
			if (err.message === 'mserv-auth did not throw')
				throw err

			_.pick(err, 'name','message','status','code','WWW-Authenticate').should.eql({
				name:'Error',
				message:'Unauthorized',
				status: 'Unauthorized',
				code: 401,
				'WWW-Authenticate': 'Basic'
			})
		}
	}))
})






