var PouchDB = require('pouchdb');
var db = new PouchDB('./db/users.json', { db: require('jsondown') });
var debug = require('debug')('server:model');

var _user = {};

function User(options){
    _user.name = options.name;
    _user.password = options.password,
    _user.admin = options.admin
}


User.prototype.save = function(callback){
    db.put({
        _id: _user.name,
        name: _user.name,
        password: _user.password,
        admin: _user.admin
      }).then(function (response) {
          debug('wrote user');
          callback();
      }).catch(function (err) {
        // debug(err);
        callback(err);
      });
      
}

User.findOne = function(username, callback){
    debug('looking for user: ' + username);
    db.get(username)
        .then(function (user) {
            debug('got user: ' + username);
            callback(null, user);
        })
        .catch(function (err) {
            debug(err);
            callback(err);
        });
    
}

module.exports = User;

