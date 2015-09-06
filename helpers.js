'use strict'

module.exports = {
	httpAuthorizationHeader,
	authorization	
}

function httpAuthorizationHeader(scheme) {
	let str = Array.prototype.slice.call(arguments,1).join(':')
	return (scheme + ' ' + Buffer(str).toString('base64')).trim()
}

function authorization() {
	return {authorization: httpAuthorizationHeader.apply(this, arguments)}
}

