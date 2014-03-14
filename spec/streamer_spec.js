var streamer = require("../streamer");

describe("for streamer", function() {

  describe("with .isTrackableChannel", function() {
    it("'subjects' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('subjects')).toBe(false);
    });
    it("'mytweets' should NOTbe trackable", function() {
      expect(streamer.isTrackableChannel('mytweets')).toBe(false);
    });
    it("'presence-mytweets' should be trackable", function() {
      expect(streamer.isTrackableChannel('presence-mytweets')).toBe(true);
    });
    it("'private-user1234' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('private-user1234')).toBe(false);
    });
    it("'private-mystream' should NOT be trackable", function() {
      expect(streamer.isTrackableChannel('private-mystream')).toBe(false);
    });
  });

  describe("with .extractPresenceChannel" , function() {
    it("should return mystream for presence-mystream", function() {
      expect(streamer.extractPresenceChannel('presence-mystream')).toEqual('mystream');
    });

    it("should return null for private-mystream", function() {
      expect(streamer.extractPresenceChannel('private-mystream')).toEqual(null);
    });

    it("should return null for mystream", function() {
      expect(streamer.extractPresenceChannel('mystream')).toEqual(null);
    });
  });

  describe("with .subjectToChannel", function() {
    it("'#tweets' should be 'presence-tweets'", function() {
      expect(streamer.subjectToChannel('#tweets')).toEqual('presence-tweets');
    });
    it("'tweets' should be 'presence-tweets'", function() {
      expect(streamer.subjectToChannel('tweets')).toEqual('presence-tweets');
    });
    it("'#OZstuff' should be 'presence-OZstuff'", function() {
      expect(streamer.subjectToChannel('#OZstuff')).toEqual('presence-OZstuff');
    });
    it("'#my_channel' should be 'presence-my_channel'", function() {
      expect(streamer.subjectToChannel('#my_channel')).toEqual('presence-my_channel');
    });
  });

  describe("with .channelToSubject", function() {
    it("'presence-tweets' should be '#tweets'", function() {
      expect(streamer.channelToSubject('presence-tweets')).toEqual('#tweets');
    });
    it("'presence-OZstuff' should be '#OZstuff'", function() {
      expect(streamer.channelToSubject('presence-OZstuff')).toEqual('#OZstuff');
    });
    it("'presence-my_channel' should be '#my_channel'", function() {
      expect(streamer.channelToSubject('presence-my_channel')).toEqual('#my_channel');
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

  describe("with .isChannelMissing", function() {
    it("should be true when no other channels", function() {
      expect(streamer.isChannelMissing('presence-foobar')).toBe(true);
    });

    it("should be true when different channels", function() {
      streamer.currentSubjects().push('#channelname');
      expect(streamer.isChannelMissing('presence-foobar')).toBe(true);
    });

    it("should be false when already existing as a channel", function() {
      streamer.currentSubjects().push('#foobar');
      expect(streamer.isChannelMissing('presence-foobar')).toBe(false);
    });

    it("should be false when already existing as a channel with different case", function() {
      streamer.currentSubjects().push('#FooBar');
      expect(streamer.isChannelMissing('presence-foobar')).toBe(false);
    });
  });


});
