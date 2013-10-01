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


});
