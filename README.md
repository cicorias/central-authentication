# Centralized Authentication Services
This example provides a server that will issue, verify, and via nodejs middleware, check tokens on API requests as an example.

There are 2 major parts to the approach:

1. The Auth server - runs on port 8000.
2. A app web site that will utilize this central authentication service

## Setup AuthN server.
Setup of the Auth Server is below
### Git clone and npm install

```
git clone ....
cd <dir>
npm install
bower install
```

### Other dependancies
#### Nodemon
While not required, there is an npm script that will use nodemon to run and debug events to the console.

```
npm install -g nodemon

```

### Modify URL for `helper.js`
Prior to running, you have to modify the `helper.js` file based upon the DNS name of the Centralized Auth server.

for example in the following modify to the DNS name and if necessary when using non-standard HTTP(S) ports add the port.  By default, the site will start and run under port `8080`.
```html
	var apiendpoint = 'http://auth.127.0.0.1.xip.io:8080/api';
```

### Create a `config.private.js` file
Copy the `config.sample.js` file to `config.private.js` and modify your secret - which is used to sign jwt.

### Run the site
There is a default gulp script that will run the gulp-webserver on port 8001, and nodemon on port 8000.  The latter represents the API site.


### Initialize a test user
Once the server is running, a `GET` to the URL `http://server/setup` will create a user with the following credentials:
username: `johndoe`
password: `password`


## Setup an App Site
On the app site, you need to update a page to include the JavaScript `helper.js` file from the Auth Server.

### Reference the `helper.js' library
For example:
```html
	<script src="http://auth.127.0.0.1.xip.io:8000/helper.js"></script>
```

### Create a Form 
You can use a form or any other method that can issue a `POST` request to the `authenticate` endpoint.  Ensure that whatever method you use you can have cookies sent on the request.

With CORS, you need to utiize support for sending credentials, which are cookies in this approach:

```javascript
$.ajax({
   url: a_cross_domain_url,
   xhrFields: {
      withCredentials: true
   }
});
```

The form stucture shown below uses the helper.js `sso.login(...)` call, passing username & password and an optional callback.
```html

<form>
	<label for="txtusername">email</label>
	<input type="email" id="txtusername" class="form-control" value="johndoe">
	<label for="txtpassword">password</label>
	<input type="password" id="txtpassword" class="form-control" value="password">
	<input type="button" class="btn btn-primary" value="sso.login" onclick="sso.login($('#txtusername').val(), $('#txtpassword').val(), updatestatus);">
	<input type="button" class="btn btn-warning" value="is logged on" onclick="sso.logincheck(updatestatus);">
</form>
```

### Callback in sample
The call back in this sample just sets a message indicating logon response... 

Also note that the sample page on the App Site has a self executing function that does a `sso.logincheck` passing the same callback.  

```javascript
	<script>
		'use strict';
		
		function updatestatus(content){
			console.log('trying to update status with: ' + content);
			$('#msg').html(content);
		}
		
		(function(){
			sso.logincheck(updatestatus);
		})()
	</script>
```


## API Explanations
There are 2 basic API endpoints that are important in the example.
#### Authenticate
This is called with a Form `POST` that contains username & password.  This valdates the user and returns a JSON response if success shaped similar to the following:

```json
{
  "success": true,
  "message": "Enjoy your token!",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiam9obmRvZSIsInByaSI6eyJhcHBzIjpbImNocm9tZS1leHRlbnNpb246Ly9maGJqZ2JpZmxpbmpiZGdnZWhjZGRjYm5jZGRkb21vcCJdfSwiaWF0IjoxNDUwMzkyNzE4LCJleHAiOjE0NTAzOTQxNTgsImF1ZCI6ImxvY2FsaG9zdCIsImlzcyI6ImxvY2FsaG9zdCIsInN1YiI6ImpvaG5kb2UifQ.pst3KloGWsUS_UON77WhVAh6MmQAORv8Ah8vx73wEQY",
  "appToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiam9obmRvZSIsInByaSI6eyJzY29wZXMiOlsiYWRtaW4iLCJjb250cmlidXRvciJdfSwiaWF0IjoxNDUwMzkyNzE4LCJleHAiOjE0NTAzOTQxNTgsImF1ZCI6ImNocm9tZS1leHRlbnNpb246Ly9maGJqZ2JpZmxpbmpiZGdnZWhjZGRjYm5jZGRkb21vcCIsImlzcyI6ImxvY2FsaG9zdCIsInN1YiI6ImpvaG5kb2UifQ.3bPGUBkDy7SW4H8So-rOX-YQOmIs9TyffiLoAwtxknA"
}

```

#### Verify
Call this to verify if there is a session.  Again, this is expecting the `token` to ride along, and if it's a cookie, the `xhr` must use the `withCredentials` in order for it to ride along with a CORS request.
This will return the same respone as shown in [Authenticate](##Authenticate)

#### LoginCheck
Any API call on this sample site against `/api` is validated for the `token` on the request.  
The code that verifies is nodejs middleware and the basics are below.  Note in this sample it looks in order for a token from:

1.  reqeust body (form)
2.  query string param
3.  header value `x-access-token`
4.  cookie value

```javascript
  var cookies = new Cookies( req, res );
  var tokencookie = cookies.get('ssoauth');
  console.log('tokencookie= ' + tokencookie);

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token']  || tokencookie;

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        next();
      }
    });
	
```
