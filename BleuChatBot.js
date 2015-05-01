var util = require('util');
var EventEmitter = require('events').EventEmitter;

var _ = require('underscore');
var colors = require('colors');
var request = require('request');

var CryptoMath = require('./cryptoMath');

var BleutradeAPI = require('bleutrade-api');

var BleuChatBot = function(opts) {
  this.opts = opts || {};

  this.opts.cookieJar = request.jar();

  this.bleutrade = new BleutradeAPI(this.opts.key, this.opts.secret);
}

util.inherits(BleuChatBot, EventEmitter);

BleuChatBot.prototype.login = function(callback) {
  var self = this;
  var options = {
    uri     : "https://bleutrade.com/api/v1/user_login",
    agent   : false,
    method  : 'POST',
    jar     : self.opts.cookieJar,
    headers : {
      "User-Agent": "Mozilla/4.0 (compatible; Bleutrade chatterBot)",
      "Content-type": "application/x-www-form-urlencoded"
    },
    form: {user:self.opts.username,
      password:self.opts.password,
      google_auth_number:"",
      login_timezone:5
    }
  };

  request(options, function(err, res, body) {
    if(!body || !res || res.statusCode != 200) {
        console.error(err);
        callback.call(err);
    } else {
      callback(err, body.substr(0,2) == 'OK');
    }
  });
}

BleuChatBot.prototype.fetchBalances = function(callback) {    
  var self = this;
  callback = callback || function () {};

  self.bleutrade.getbalances(null, function(err, data) {
    if(err || !data || !data.success) {
      console.error("Failed to update balances...");
      return callback(err);
    };

    return callback(err, _.chain(data.result)
      .reduce(function(all, fund) {
        all.push({currency: fund.Currency, available: CryptoMath.round(parseFloat(fund.Available))});
        return all;
      }, [])
      .filter(function(fund) { return fund.available > 0.0000001;})
      .value()
    );
  })
};

BleuChatBot.prototype.chat = function(msg, lang, callback) {
  callback = callback || function () {};

  //console.log(msg);
  //return callback();

  var self = this;

  var options = {
    uri     : "https://bleutrade.com/functions/chat_send",
    agent   : false,
    method  : 'POST',
    jar     : self.opts.cookieJar,
    headers : {
      "User-Agent": "Mozilla/4.0 (compatible; Bleutrade chatterBot)",
      "Content-type": "application/x-www-form-urlencoded"
    },
    form: {chat_text: msg,
      chat_lang: lang
    }
  };

  request(options, function(err, res, body) {
    if(!body || !res || res.statusCode != 200) {
        console.error(err);
        callback.call(err);
    } else {
      callback(err, JSON.parse(body));
    }
  });
}

module.exports = BleuChatBot;