var gulp = require('gulp');
var webserver = require('gulp-webserver');
var nodemon = require('gulp-nodemon');
var env = require('gulp-env');
var debug = require('debug')('gulp:tasks');

var User = require('./app/model/user.js');
 
gulp.task('webserver', function() {
  gulp.src('staticsite')
    .pipe(webserver({
      path: '/',
      port: 8001,
      livereload: false,
      host: 'siteA.127.0.0.1.xip.io',
      open: true,
      fallback: 'index.html'
    }));
});


gulp.task('nodemon', function () {
  nodemon({
    script: 'server.js'
  , env: { 'NODE_ENV': 'development', 
    'PORT':8000, 'DEBUG': 'server:*' }
  })
});


gulp.task('default', ['webserver', 'nodemon']);


gulp.task('createuser', ['set-env'], function(){
  // create a sample user
  createUser();
})

gulp.task('set-env', function () {
  env({
    vars: {
      DEBUG: "*:*"
    }
  });  
});


function createUser(){
  var user = new User({ 
    name: 'johndoe', 
    password: 'password',
    admin: true 
  });

  // save the sample user
  user.save(function(err) {
    if (err) {
        errorHandler(err);
    }
    else {
        debug('create a test user');
    }
  });    
}


function errorHandler (err) {
  debug('error on : ', err);
  console.error('didn\'t create user.. ', err);
  this.emit('end');
}
