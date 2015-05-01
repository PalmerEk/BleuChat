var CryptoMath = function(opts) {
  this.opts = opts || {
    percision: -8    
  };
};

function _decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

CryptoMath.prototype.round = function(value) { return _decimalAdjust('round', value, this.opts.percision); };
CryptoMath.prototype.floor = function(value) { return _decimalAdjust('floor', value, this.opts.percision); };
CryptoMath.prototype.ceil = function(value) { return _decimalAdjust('ceil', value, this.opts.percision); };

/*
CryptoMath.prototype.cost = function(askPrice, fee) { return _decimalAdjust('ceil', ((1/askPrice)*(1-(fee/100))), this.opts.percision); };
CryptoMath.prototype.value = function(bidPrice, fee) { return _decimalAdjust('floor', bidPrice*(1+(fee/100)), this.opts.percision); };
*/
CryptoMath.prototype.fee = function(total, fee) { return _decimalAdjust('ceil', total*(fee/100), this.opts.percision); };

CryptoMath.prototype.qtyPurchaseable = function(price, funds) { return _decimalAdjust('floor', funds/price, this.opts.percision); };

//CryptoMath.prototype.cost = function(askPrice, fee) { return _decimalAdjust('ceil', ((1/askPrice)*(1-(fee/100))), this.opts.percision); };
//CryptoMath.prototype.value = function(bidPrice, fee) { return _decimalAdjust('floor', bidPrice*(1+(fee/100)), this.opts.percision); };


module.exports = new CryptoMath();
