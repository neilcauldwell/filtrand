var ChannelBank = require("../channelbank");

describe("for ChannelBank", function() {

  describe("with .hasWhiteListedSource", function() {
    it("should be true for web", function() {
      var tweet = { source: "nurph" };
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should be true for web", function() {
      var tweet = { source: "blah WEB blah" };
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(true);
    });
    
    it("should be true for hubspot", function() {
      var tweet = { source: "blahhubspot" };
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should be true for tweetdeck (with full url)", function() {
      var tweet = { source: '<a href=https://about.twitter.com/products/tweetdeck" rel="nofollow">TweetDeck</a>' };
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should not be true for tenchotweeter", function() {
      var tweet = { source: "tenchotweeter" };
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for an undefined source", function() {
      var tweet = {};
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for a null tweet", function() {
      var tweet = {};
      expect(ChannelBank.prototype.hasWhiteListedSource(tweet)).toBe(false);
    });
  });

});
