var settings = require(process.env.settingsFile || './settings')
var util = require('util');
var fs = require('fs');

var _ = require('underscore');
var colors = require('colors');
var request = require('request');
var moment = require('moment');
var io = require('socket.io-client')('wss://nodejs1.bleutrade.com:8080');

var CryptoMath = require('../lib/cryptoMath');
var db = require("./db");

var BleuChatBot = require('./BleuChatBot.js');

var rainbotChat = new BleuChatBot(settings.bots.rainbot);
var sprinklebotChat = new BleuChatBot(settings.bots.sprinklebot);

var googleTranslate = require('google-translate')(settings.google.translate.key);

var chatState = require(settings.stateFile);

function saveState() {
  fs.writeFile(settings.stateFile, JSON.stringify(chatState));
}

function CnC(msg, callback) {
  var self = this;
  var origMsg = msg;

  // Are there any messages for me?
  _.chain(chatState.msgs)
    .where({to: origMsg.nick})
    .each(function(msg) { rainbotChat.chat(util.format("@%s From @%s: %s", origMsg.nick, msg.from, msg.msg), origMsg.lang) });
  chatState.msgs = _.reject(chatState.msgs, function(msg) {return msg.to == origMsg.nick;});


  var args = msg.msg.toLowerCase().match(/\S+/g);
  if(args && args.length > 1 && args[0]=='/c') { // you talken to me?
    if(_.contains(args, 'bans')) {
      if(chatState.tempban.length > 0) {
        var msg = (chatState.tempban.length == 0) ? "No active bans" : util.format("{842} @%s Dead to me: %s", origMsg.nick, _.reduce(chatState.tempban, function(all, nick) {return all + " @" + nick;}, ""));

        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(msg);
        });
      } 
    } else if(_.contains(args, 'ban')) {
      var banedIndex = args.indexOf('ban')+1;
      if(banedIndex < args.length && !_.contains(chatState.tempban, origMsg.nick) && !_.contains(chatState.tempban, args[banedIndex])) {
        var bannedNick = args[banedIndex].replace('@', '');
        if(!_.contains(settings.mods, origMsg.nick)) chatState.tempban.push(origMsg.nick);  // mods don't get banned
        if(!_.contains(settings.mods, bannedNick)) chatState.tempban.push(bannedNick);

        var msg = util.format("{842} @%s has thrown himself on his own sword for the sake of us all by banning @%s from rain.  They will be missed", origMsg.nick, bannedNick);
        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(msg);
        });
      }
    } else if(_.contains(args, 'pban') && _.contains(settings.mods, msg.nick)) {
      var banedIndex = args.indexOf('pban')+1;
      if(banedIndex < args.length) {
        var bannedNick = args[banedIndex].replace('@', '');
        if(!_.contains(settings.mods, bannedNick) && _.contains(settings.mods, origMsg.nick)) chatState.permaban.push(bannedNick);
      }
    } else if(/(\d*|\d*\.\d*)\s*([A-Za-z0-9]{2,5})\s+(to|in)\s+([A-Za-z0-9]{2,5})/i.test(msg.msg)) {   // /c \d CUR to CUR

      var matches = origMsg.msg.match(/(\d*|\d*\.\d*)\s*([A-Za-z0-9]{2,5})\s+(to|in)\s+([A-Za-z0-9]{2,5})/i);
      var qty = Number(matches[1]);
      if(qty <= 0) qty = 1;

      var from = matches[2];
      var to = matches[4];

      rainbotChat.bleutrade.getorderbook(from+"_"+to, "BUY", 50, function(err, orderbook) {
        var msg = ""
        if(err || !orderbook || orderbook.success != 'true' || orderbook.result.buy.length <= 0) {
          msg = util.format("@%s Cannot open orderbook for market %s", origMsg.nick, from+"_"+to);
        } else {
          msg = util.format("@%s Book: %d %s = %d %s", origMsg.nick, CryptoMath.round(qty), from, CryptoMath.round((qty*Number(orderbook.result.buy[0].Rate))), to);

          var order = orderbook.result.buy.reduce(function(result, order) {
            if(result.remaining > 0) {
              var qtyAtThisLevel = Math.min(result.remaining, order.Quantity);

              result.remaining -= qtyAtThisLevel;
              result.lastPrice = order.Rate;
              result.total += (order.Rate*qtyAtThisLevel);
           }
            return result;
          }, {remaining: qty, total: 0, lastPrice: orderbook.result.buy[0].Rate});

          if(order.remaining > 0) { // too deep to calculate
            msg += util.format(" Market: %d %s = %d %s (%d) (TOO DEEP)", CryptoMath.round(qty-order.remaining), from, CryptoMath.round(order.total), to, order.lastPrice)  
          } else {
            msg += util.format(" Market: %d %s = %d %s (%d)", CryptoMath.round(qty-order.remaining), from, CryptoMath.round(order.total), to, order.lastPrice)  
          }
        }

        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(msg);
        });
      })

    } else if(_.contains(args, 'seen')) {
      var seenIndex = args.indexOf('seen')+1;
      if(seenIndex < args.length) {
        var seenNick = args[seenIndex].replace('@', '');
        var lastMsg = _.findWhere(chatState.userPool, {nick: seenNick.toLowerCase()});

        var msg = lastMsg ? util.format("@%s, Last saw @%s %s", origMsg.nick, seenNick, moment(lastMsg.sent).from(origMsg.sent)) : util.format("@%s, It's been a while since %s has been on", origMsg.nick, seenNick);

        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(msg);
        });
      }
    } else if(_.contains(args, 'msg')) {
      var msgIndex = args.indexOf('msg')+1;
      if(msgIndex < args.length+1) {
        var msgNick = args[msgIndex].replace('@', '');
        var msgText = origMsg.msg.match(/\S+/g).slice(msgIndex+1).join(' ');
        chatState.msgs.push({from: origMsg.nick, to: msgNick, sent: origMsg.sent, msg: msgText});

        var msg = util.format("@%s, I will tell @%s when I see them", origMsg.nick, msgNick);

        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(msg);
        });
      }
    } else {  // translate text
      var msgData = _.reduce(args.slice(1), function(all, txt) {
        if(txt[0] == '@') {
          all.users += ' ' + txt;
        } else {
          all.txt += txt + ' ';
        }
        return all;
      }, {txt: '', users: ''})

      googleTranslate.translate(msgData.txt, 'en', function(err, translation) {
        var msg = util.format("@%s: %s%s", origMsg.nick, translation.translatedText, msgData.users);
        rainbotChat.chat(msg, origMsg.lang, function(err, result) {
          console.log(util.format("Translated: %s to %s", msgData.txt, msg));
        });
      });
    }
  }

  callback();
}

function getNickPool(callback) {
  var eligiblePool = _.chain(chatState.userPool)
    .last(50) // Limit selection pool to last 50
    .filter(function(msg) {return msg.nickCSSClass != 'chat_nick_newbie'})  // get a list of nicks, invalidating anyone who doesn't have a chat_nick CSS Class (ie. chat_nick_newbie)
    .filter(function(msg) {return !_.contains(chatState.permaban, msg.nick)})  // remove anyone who is perma baned
    .filter(function(msg) {return !_.contains(chatState.tempban, msg.nick)})  // remove anyone who is temp baned
    .shuffle()
  .value();

  chatState.tempban = _.intersection(_.chain(chatState.userPool).last(50).pluck('nick').value(), chatState.tempban); // Lift the ban for anyone who has been quite long enough

  return callback(null, eligiblePool);
}

function rainbot(){
  rainbotChat.fetchBalances(function(err, coins) {
    var winCoins = _.chain(coins) 
      .shuffle()
      .first(5)
    .value();

    var msg = _.reduce(winCoins, function(all, coin) {return all + util.format("%d %s ", CryptoMath.round(Math.max(0.00000001, coin.available/5).toFixed(8)), coin.currency)}, "") + "{098} ";

    getNickPool(function(err, winnerPool){
      var winners = _.chain(winnerPool)
        .first(5)
        .each(function(winner) {
          _.each(winCoins, function(coin) {
            makePayment(rainbotChat, coin.currency, CryptoMath.round(Math.max(0.00000001, coin.available/5)), winner.nick, function(err, result) {});
          });
        })
      .value();

      msg = msg + rainbotChat.opts.congrats + _.reduce(winners, function(all, winner) { return all + " @"+winner.nick}, "")
      rainbotChat.chat(msg, rainbotChat.opts.lang, function(err, result) {
        console.log(msg);
      })
    })
  });
}

function sprinklebot(){
  sprinklebotChat.fetchBalances(function(err, coins) {
    if(coins.length > 0) { // we have something to sprinkle
      var coin = _.chain(coins)
        .filter(function(coin) {return !_.chain(sprinklebotChat.opts.steadybotCurrencies)
                                        .map(function(steadybotCurrency) {return steadybotCurrency.currency;})
                                        .contains(coin.currency)
                                      .value()})
        .shuffle()
        .first()
      .value();

      if(_.isUndefined(coin)) return;

      var dispenseAmt = CryptoMath.round(Math.max(0.00000001, coin.available * ((Math.floor(Math.random()*(11-5))+5)/100)/10));
      
      var msg = util.format("%d %s {097} ", dispenseAmt.toFixed(8), coin.currency);

      getNickPool(function(err, winnerPool){
        var winners = _.chain(winnerPool)
          .first(10)
          .each(function(winner) {
            makePayment(sprinklebotChat, coin.currency, dispenseAmt, winner.nick, function(err, result) {});
          })
        .value();

        msg = msg + rainbotChat.opts.congrats + _.reduce(winners, function(all, winner) { return all + " @"+winner.nick}, "");
        sprinklebotChat.chat(msg, sprinklebotChat.opts.lang, function(err, result) {
          console.log(("sprinklebot: " + msg).green);
        })
      });
    }
  });
  setTimeout(sprinklebot, Math.floor(Math.random()*20) * 60000);
}

function steadybot(){
  sprinklebotChat.fetchBalances(function(err, coins) {
    
    if(coins.length > 0) { // we have something to sprinkle
      var coin = _.chain(coins)
        .filter(function(coin) {return _.chain(sprinklebotChat.opts.steadybotCurrencies)
                                        .map(function(steadybotCurrency) {return steadybotCurrency.currency;})
                                        .contains(coin.currency)
                                      .value()})
        .shuffle()
        .first()
      .value();

      if(_.isUndefined(coin)) return;

      var dispenseAmt = _.findWhere(sprinklebotChat.opts.steadybotCurrencies, {currency: coin.currency}).amt;
      var msg = util.format("%d %s {097}", dispenseAmt, coin.currency);

      getNickPool(function(err, winnerPool){
        var winners = _.chain(winnerPool)
          .first(5)
          .each(function(winner) {
            makePayment(sprinklebotChat, coin.currency, dispenseAmt, winner.nick, function(err, result) {});
          })
        .value();

        msg = msg + rainbotChat.opts.congrats + _.reduce(winners, function(all, winner) { return all + " @"+winner.nick}, "");
        sprinklebotChat.chat(msg, sprinklebotChat.opts.lang, function(err, result) {
          console.log(("steadybot: " + msg).blue);
        })
      });
    }
  });
}

function makePayment(botChat, currency, amt, user, callback) {
  //console.log(util.format("- %s: PAYING %s %d %s", botChat.opts.botname, user, amt, currency));

  botChat.bleutrade.transfer(currency, amt, user, function(err, result) {
    db.recordPayout(botChat.opts.botname, currency, amt, user, callback);
  });
}

// launch rainbot 
rainbotChat.login(function(err, result) {
  setInterval(rainbot, 121000);
});


// launch sprinklebot
sprinklebotChat.login(function(err, result) {
  sprinklebot();
  setInterval(steadybot, 177000);
});


// start listening for events
io.on('message', function (data) {
  var channel = data[0];
  if(channel === 'Bleutrade_CH1') {
    var msgType = data[1][0];

    if(msgType == 'public_chat_new_message') {
      var msg = {lang: data[1][1][0], 
        nick: data[1][1][1], 
        msg: data[1][1][2],
        nickCSSClass: data[1][1][3],  // always chat_nick? nope chat_nick_newbie = unregistered
        var2: data[1][1][4],       // always null?
        sent:  data[1][1][5]
      }

      chatState.userPool.push(msg);  // add msg to end
      chatState.userPool = _.uniq(chatState.userPool.reverse(), function(msg) {return msg.nick;}).reverse(); // make it unique BUT make sure their earlier position is the one removed

      CnC(msg, function(err) {
        saveState();
      }); // Check with Command and Control
    }
  }
});
