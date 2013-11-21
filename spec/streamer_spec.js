var streamer = require("../streamer");

describe("for streamer", function() {

  describe("with .isTrackableChannel", function() {
    it("'subjects' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('subjects')).toBe(false);
    });
    it("'mytweets' should be trackable", function() {
      expect(streamer.isTrackableChannel('mytweets')).toBe(true);
    });
    it("'presence-mytweets' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('presence-mytweets')).toBe(false);
    });
    it("'private-user1234' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('private-user1234')).toBe(false);
    });
    it("'private-mystream' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('private-mystream')).toBe(false);
    });
  });

  describe("with .subjectToChannel", function() {
    it("'#tweets' should be 'tweets'", function() {
      expect(streamer.subjectToChannel('#tweets')).toEqual('tweets');
    });
    it("'tweets' should be 'tweets'", function() {
      expect(streamer.subjectToChannel('tweets')).toEqual('tweets');
    });
    it("'#OZstuff' should be 'OZstuff'", function() {
      expect(streamer.subjectToChannel('#OZstuff')).toEqual('OZstuff');
    });
    it("'#my_channel' should be 'my_channel'", function() {
      expect(streamer.subjectToChannel('#my_channel')).toEqual('my_channel');
    });
  });

  describe("with .channelToSubject", function() {
    it("'tweets' should be '#tweets'", function() {
      expect(streamer.channelToSubject('tweets')).toEqual('#tweets');
    });
    it("'OZstuff' should be '#OZstuff'", function() {
      expect(streamer.channelToSubject('OZstuff')).toEqual('#OZstuff');
    });
    it("'my_channel' should be '#my_channel'", function() {
      expect(streamer.channelToSubject('my_channel')).toEqual('#my_channel');
    });
  });

  describe("with .thasWhiteListedSource", function() {
    it("should be true for web", function() {
      var tweet = { source: "nurph" };
      expect(streamer.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should be true for web", function() {
      var tweet = { source: "blah WEB blah" };
      expect(streamer.hasWhiteListedSource(tweet)).toBe(true);
    });
    
    it("should be true for hubspot", function() {
      var tweet = { source: "blahhubspot" };
      expect(streamer.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should not be true for tenchotweeter", function() {
      var tweet = { source: "tenchotweeter" };
      expect(streamer.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for an undefined source", function() {
      var tweet = {};
      expect(streamer.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for a null tweet", function() {
      var tweet = {};
      expect(streamer.hasWhiteListedSource(tweet)).toBe(false);
    });
  });


});
