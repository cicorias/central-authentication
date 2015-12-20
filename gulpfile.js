var gulp = require('gulp');
var webserver = require('gulp-webserver');
var nodemon = require('gulp-nodemon'); //conflics with pouchdb and file locks
var exec = require('gulp-exec');
var notify = require('gulp-notify');
var notifier = require('node-notifier');
// var env = require('gulp-env');

var User = require('./app/model/user.js');
 
gulp.task('webserver', function() {
   gulp.src('staticsite')
    .pipe(webserver({
      path: '/',
      port: 8001,
      livereload: false,
      host: 'www1.127.0.0.1.xip.io',
      open: true,
      fallback: 'index.html'
    }));
    
});


gulp.task('default', ['webserver']);

gulp.task('createuser', function(){
  createUser();
  notifier.notify({title: 'creating user', message: 'end...'});
})


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
  console.error('didn\'t create user.. ', err);
  this.emit('end');
}
