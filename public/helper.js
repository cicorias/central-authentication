(function(window){
	
	'use strict';
	var sso = sso || {};

	if (! jQuery) {  
    	console.error('jQuery is not loaded'); 
	} 
	
	
	var cookiename = 'appssojwt'; //this will be a cookie in the domain of the current site, not the Auth / IDP
	//FYI: a cookie named 'ssoauth' comes from the IDP/Auth server it is managed entirely by that...
	//  - however, since THIS script is hosted on that IDP/Auth server scripts will send this to the server
	//  - on any request that utilizes the 'xhrFields:withCredentials:true' setting. Otherwide, no cookies are sent.
	//  - an alternative could be that the scrpit here may send the App token by reading it and appending to header, query,
	//  - body, etc
	// var ssocookiename = 'ssoauth';
	
	var apiendpoint = 'http://auth.127.0.0.1.xip.io:8000/api';
	var authendpoint = apiendpoint + '/authenticate';
    var verifyendpoint = apiendpoint + '/verify';

	
	sso.login = function(username, userpassword, callback){
		console.log('logging in user...' + username + ':' + userpassword);
		
		//the following response returns a cookie...  for the Auth / IDP site...
		$.ajax(
			{
				method: 'POST',
				url: authendpoint,
				data: { name: username, password: userpassword },
				xhrFields: {
					withCredentials: true
				}
				
			}
		).done( function(msg){
			createCookie(cookiename, msg.appToken, 1);  ///NOTE that 2 tokens come back - the IDP(token) and the token for THIS App (appToken)
			if (callback) callback('you are logged in...');
			console.log('you have been logged on');
			console.log(msg);
			
		}).error(function(err){
			console.error('failed on auth call', err);
			eraseCookie(cookiename);
		});

		
	};
	
	
	/** 
	 * Provides a quick check IF the user is logged on; as it will receive a cookie WITH the request
	 * since the 'xhrFields:withCredentials:true' is on.
	 * TODO: is this is called, perhaps (probably) should return a token back to the caller.
	 * */
	sso.logincheck = function(callback){
		console.log('logincheck..');
		console.log(document.cookie);
		
		$.ajax(
			{
				method: 'POST',
				url: verifyendpoint, // + '?token=' + getCookie(ssocookiename),
				xhrFields: {
					withCredentials: true
				},
				statusCode: {
					403: function(){
                        failedLogon('-- 403');
                    }
  				}
			}

		).done( function(msg){
			console.log('got a response on logincheck');	
			if (msg.success === "false"){
			 	failedLogon('success == false');
			}
			else {
				if (callback){
					callback('user is logged on...');
					//TODO: perhaps check if token exists - or just logon again.
					//TODO: but the logon endpoint would be different - such as 'refresh'
					//TODO: since username/password isn't sent. The responsibilities
					//TODO: of the server call has to validate the token is still withing some not before/after time frame
					//TODO: along with signature - then issue a token for the site requesting the 'islogin'
				}
				
				createCookie(cookiename, msg.appToken, 1);  ///NOTE that 2 tokens come back - the IDP(token) and the token for THIS App (appToken)
				return true;
			}	
		}).error(function(err){
			console.log('failed on logincheck call: ' + err);
			if (callback)
				callback('user is NOT logged on...');
				
			return false;
		});
		
		return false; //undefined;
	}
	
	sso.setCookie = function(name,value,days){
		console.log('called to set cookie: ' + name + ' : ' + value);
		createCookie(name, value, days);
	}
	
	function failedLogon(msg, callback){
		console.log('failed to logon: ' + msg);
		if (callback)
			callback('user is NOT logged on...');
	}
	
	
	function createCookie(name,value,days) {
		var expires = "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			expires = "; expires="+date.toGMTString();
		}
		
		document.cookie = name+"="+value+expires+"; path=/";
	}
	
	function eraseCookie(name) {
    	createCookie(name,"",-1);
	}
	
	function getCookie(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for(var i=0; i<ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1);
			if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
		}
		return "";
	}
	
	/* 
	executeOnce(callback[, thisObject[, argumentToPass1[, argumentToPass2[, …[, argumentToPassN]]]]], identifier[, onlyHere])
	
	FYI- this does nothing - just an example on how to execute something one time - save's state in a cookie - any furuther oopens
	of the browser will "happen" again.  My intent was to wire this up to he sso.isLoging check...
	*/
	sso.executeOnce = function executeOnce () {
		var argc = arguments.length, bImplGlob = typeof arguments[argc - 1] === "string";
		if (bImplGlob) { argc++; }
		if (argc < 3) { throw new TypeError("executeOnce - not enough arguments"); }
		var fExec = arguments[0], sKey = arguments[argc - 2];
		if (typeof fExec !== "function") { throw new TypeError("executeOnce - first argument must be a function"); }
		if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { throw new TypeError("executeOnce - invalid identifier"); }
		if (decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) === "1") { return false; }
		fExec.apply(argc > 3 ? arguments[1] : null, argc > 4 ? Array.prototype.slice.call(arguments, 2, argc - 2) : []);
		document.cookie = encodeURIComponent(sKey) + "=1; expires=Fri, 31 Dec 9999 23:59:59 GMT" + (bImplGlob || !arguments[argc - 1] ? "; path=/" : "");
		return true;
	}
	
	
	window.sso = sso;
	
})(window);
