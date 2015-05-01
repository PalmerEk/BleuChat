var settings = require(process.env.settingsFile || './settings');

var util = require('util');
var path = require('path');
var _ = require('underscore');

var mysql = require('mysql');
var pool  = mysql.createPool(settings.database);

/**********************************************/
// Helpers
/**********************************************/
function firstOrNull (list) {
  return (list && list.length > 0) ? list[0] : null
}

function firstOrEmpty(list) {
  return (list && list.length > 0) ? list[0] : {}
}

// any and all database queries should pass through here
function query(sql, params, callback) {
	if ('function' == typeof params) { callback = params, params = []; }
	callback = callback || function () {};

	pool.getConnection(function(err, oConn) {
	  oConn.query( sql, params, function(err, results, fields) {
	  	if (err) {
			console.error("query: " + util.inspect(err, false, 5, true));
			console.error(util.format("SQL: %s\nPARAMS: %s", sql, util.inspect(params, false, 5, true)));
		}

	    callback(err, results, fields);
	    oConn.release();
	  });
	});
}

/**********************************************/
// 
/**********************************************/
exports.recordPayout = function(botname, coin, amt, username, callback) {
	callback = callback || function () {};

	var sql = "INSERT INTO dist \
				(botname, username, coin, amount) \
				VALUES (?, ?,?,?)";

	var parms = [botname, username, coin, amt];

	query(sql, parms, function startGame_CB(err, result) {
		return callback(err, result.affectedRows == 1);
	});
}
