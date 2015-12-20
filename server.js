// =======================
// get the packages we need ============
// =======================
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var path        = require('path');

var Cookies     = require('cookies');

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config.private'); // get our config file
var User   = require('./app/model/user'); // get our model

var debug  = require('debug')('server:main');
    
// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8000; // used to create, sign, and verify tokens

app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));


// allow on CORS
app.use(function(req, res, next) {
  /**
   * TODO: caller verification is part of the mix....
   * 1. caller needs to be validated against whitelist; all other's are denied.
   * */
  //just get the caller and allow it...
  var caller = req.get('origin');
  /// TODO: this needs to be validated - the caller - and only allow whitelist ones
  res.header("Access-Control-Allow-Origin", caller);
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});



// =======================
// routes ================  
// =======================
// basic route
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// static content
app.use(express.static(path.join(__dirname, 'public')));


// API ROUTES -------------------

/// TODO: this sets up user for a demo...
app.get('/setup', function(req, res) {

  // create a sample user
  var user = new User({ 
    name: 'johndoe', 
    password: 'password',
    admin: true 
  });

  // save the sample user
  user.save(function(err) {
    debug('back...');
    if (err) {
        res.status(500).send({ error: true, err: err});
    }
    else {
        debug('User saved successfully');
        res.status(200).send({ success: true });
    }
  });
});


// get an instance of the router for api routes
var apiRoutes = express.Router(); 

apiRoutes.post('/authenticate', function(req, res, next) {

  /**
   * TODO: Issue tokens based upon the "site" - not a generic token...
   * 1. Based upon a caller - use a clientID, clientSecret - 
   * 2. Modify the token signature to use RSA instead of HMAC/SHA2
   * 3. Issue 2 tokens - first is FROM this IDP/Authority - which gets put in the Set-Cookie header
   *     on the response..
   *    The second toke is a "app (RP/SP)" token that the App requesting the token can use 
   *    with scopes.  The app then manages this token and potentially can use it as a session ID
   *    and probably should use it for REST calls as it's signed by THE authority.
   * */  

  var usernameRequested = req.body.name;
  debug('request for user: ' + usernameRequested);
  // find the user
  User.findOne(usernameRequested, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.status(404).send ({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        res.status(401).send ({ success: false, message: 'Authentication failed. User not found.' });
      } else {
        debug('auth ok');
        /// REVIEW JWT here: https://tools.ietf.org/html/rfc7519 
        
        // if user is found and password is right
        // create a token for use in the header response as the AUTH/IDP's token
        var token = jwt.sign( {
          name: user.name,
          pri: {
            apps: [req.get('origin')]  // here we may want to add all the known 'apps that so far this users is auth'd against using the token that should've been received if it exsited before this.
          }
        },
          app.get('superSecret'), {
          algorithm :'HS256',
          expiresIn: 1440, // expires in 24 hours
          issuer: req.hostname,
          audience: req.hostname,
          subject: usernameRequested // change this to something immutable for THE user
          //headers: { alg: 'HS256', typd: 'JWT'}
        });
        
        
        var appToken = issueAppToken(req, res, user);

        // return the information including token as JSON
        /**
         * TODO: may not need to include the auth token below, just the 'appToken
         * */
        res.cookie('ssoauth', token);
        
        res.status(200).send({
          success: true,
          message: 'Enjoy your token!',
          token: token,
          appToken: appToken
        });        
      }   
    }
  });
});

function issueAppToken(req, res, user){
  var appToken = jwt.sign({ 
      name: user.name,
      pri: { 
        scopes: ['admin', 'contributor']}  ///lookup - something specfiic for THIS app...
    },  
    app.get('superSecret'), {
    algorithm :'HS256',
    expiresIn: 1440, // expires in 24 hours
    issuer: req.hostname,
    audience: req.get('origin'),
    subject: user.name // change to something immutable for THE user
    //headers: { alg: 'HS256', typd: 'JWT'}
  });
  
  return appToken;
}

apiRoutes.post('/verify', function(req, res, next){
  debug('verify token');
  var cookies = new Cookies( req, res );
  var tokencookie = cookies.get('ssoauth');
  debug('tokencookie= ' + tokencookie);
    // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token']  || tokencookie;

  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        debug('decoded token: ');
        debug(JSON.stringify(decoded));
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        //var decodedToken = jwt.decode(token);
        User.findOne(decoded.name, function(err, user){
            var appToken = issueAppToken(req, res, user);
            res.json({
            success: true,
            message: 'Enjoy your token!',
            token: token,  //do we "refresh this" - i think NOT as we're not authenticating here...
            appToken: appToken
            });    
        }); 
        
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });    
  }
  
})

// route middleware to verify a token
apiRoutes.use(function(req, res, next) {

  var cookies = new Cookies( req, res );
  var tokencookie = cookies.get('ssoauth');
  debug('tokencookie= ' + tokencookie);

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

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
    
  }
});

// TODO: route middleware to verify a token

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});   

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);


// =======================
// start the server ======
// =======================
app.listen(port);

debug('Magic happens at http://localhost:' + port);
