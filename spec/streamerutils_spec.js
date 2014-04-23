var streamerutils = require("../streamerutils");

describe("for streamerutils", function() {

  describe("with .isTrackableChannel", function() {
    it("'subjects' should NOT be trackable", function() {
      expect(streamerutils.isTrackableChannel('subjects')).toBe(false);
    });
    it("'mytweets' should be trackable", function() {
      expect(streamerutils.isTrackableChannel('mytweets')).toBe(true);
    });
    it("'presence-mytweets' should NOT be trackable", function() {
      expect(streamerutils.isTrackableChannel('presence-mytweets')).toBe(false);
    });
    it("'private-user1234' should NOT be trackable", function() {
      expect(streamerutils.isTrackableChannel('private-user1234')).toBe(false);
    });
    it("'private-mystream' should NOT be trackable", function() {
      expect(streamerutils.isTrackableChannel('private-mystream')).toBe(false);
    });
  });

  describe("with .subjectToChannel", function() {
    it("'#tweets' should be 'tweets'", function() {
      expect(streamerutils.subjectToChannel('#tweets')).toEqual('tweets');
    });
    it("'tweets' should be 'tweets'", function() {
      expect(streamerutils.subjectToChannel('tweets')).toEqual('tweets');
    });
    it("'#OZstuff' should be 'OZstuff'", function() {
      expect(streamerutils.subjectToChannel('#OZstuff')).toEqual('OZstuff');
    });
    it("'#my_channel' should be 'my_channel'", function() {
      expect(streamerutils.subjectToChannel('#my_channel')).toEqual('my_channel');
    });
  });

  describe("with .channelToSubject", function() {
    it("'tweets' should be '#tweets'", function() {
      expect(streamerutils.channelToSubject('tweets')).toEqual('#tweets');
    });
    it("'OZstuff' should be '#OZstuff'", function() {
      expect(streamerutils.channelToSubject('OZstuff')).toEqual('#OZstuff');
    });
    it("'my_channel' should be '#my_channel'", function() {
      expect(streamerutils.channelToSubject('my_channel')).toEqual('#my_channel');
    });
  });

});
