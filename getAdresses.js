var settings = require(process.env.settingsFile || './settings')
var util = require('util');

var _ = require('underscore');
var colors = require('colors');

var BleutradeAPI = require('bleutrade-api');
//var bleutrade = new BleutradeAPI(settings.bots.rainbot.key, settings.bots.rainbot.secret);
var bleutrade = new BleutradeAPI(settings.bots.sprinklebot.key, settings.bots.sprinklebot.secret);

function getdepositaddresses(cb) {
	bleutrade.getcurrencies(function(err, currencies) {
		cb(null, _.chain(currencies.result)
			.filter(function(currency) {return currency.IsActive;})
			.reduce(function(all, currency) { all.push(currency.Currency); return all;}, [])
			.value()
		);
	}) 
}

getdepositaddresses(function(err, currencies) {
	_.each(currencies, function(currency) {
		bleutrade.getdepositaddress(currency, function(err, address){
	    if(!err && address && address.success && address.result.Address) 
	    	console.log(util.format("%s -- %s"), currency, address.result.Address);
	  })
	});
});
