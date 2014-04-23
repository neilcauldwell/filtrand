var ChannelBank = require("../channelbank");

describe("for ChannelBank", function() {
  var cb, listener;

  beforeEach(function() {
    cb = new ChannelBank(null, null, null);
  });

  afterEach(function() {
    cb.clear();
  });

  describe("with .track", function() {
    beforeEach(function() {
      cb.subjects = ['#litchat', '#seochat', '#brandchat'];
      cb.subjectsPendingDisconnection = ['#brandchat'];
      spyOn(cb, "emitEvent");
      spyOn(cb, "ntwitterConnect");
    });

    describe("with an empty subjectlist", function() {
      beforeEach(function() {
        cb.track([]);
      });

      it("should not emit an event", function() {
        expect(cb.emitEvent).not.toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should not change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat']);
      });

      it("should not call ntwitterConnect()", function() {
        expect(cb.ntwitterConnect).not.toHaveBeenCalled();
      });
    });

    describe("when the subject/s are not new", function() {
      beforeEach(function() {
        cb.track(['#litchat', '#seochat']);
      });

      it("should not emit an event", function() {
        expect(cb.emitEvent).not.toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should not change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat']);
      });

      it("should not call ntwitterConnect()", function() {
        expect(cb.ntwitterConnect).not.toHaveBeenCalled();
      });
    });

    describe("when the subject is new", function() {
      beforeEach(function() {
        cb.track(['#scifichat']);
      });

      it("should not emit an event", function() {
        expect(cb.emitEvent).toHaveBeenCalled();
      });

      it("should change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat', '#scifichat']);
      });

      it("should not change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat']);
      });

      it("should call ntwitterConnect()", function() {
        expect(cb.ntwitterConnect).toHaveBeenCalled();
      });
    });

    describe("when the subject is on the pending disconnection list", function() {
      beforeEach(function() {
        cb.track(['#brandchat']);
      });

      it("should emit an event", function() {
        expect(cb.emitEvent).toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual([]);
      });

      it("should not call ntwitterConnect()", function() {
        expect(cb.ntwitterConnect).not.toHaveBeenCalled();
      });
    });
  });

  describe("with .untrack", function() {

    beforeEach(function() {
      cb.subjects = ['#litchat', '#seochat', '#brandchat'];
      cb.subjectsPendingDisconnection = ['#brandchat'];
      spyOn(cb, "emitEvent");
    });
    
    describe("when the subject is not being tracked", function() {
      beforeEach(function() {
        cb.untrack('#scifichat');
      });

      it("should not emit an event", function() {
        expect(cb.emitEvent).not.toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should not change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat']);
      });
    });

    describe("when the subject is being tracked", function() {
      beforeEach(function() {
        cb.untrack('#litchat');
      });

      it("should emit an event", function() {
        expect(cb.emitEvent).toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat', '#litchat']);
      });
    });

    describe("when the subject is being tracked and pending disconnection", function() {
      beforeEach(function() {
        cb.untrack('#brandchat');
      });

      it("should emit an event", function() {
        expect(cb.emitEvent).toHaveBeenCalled();
      });

      it("should not change the subjects list", function() {
        expect(cb.subjects).toEqual(['#litchat', '#seochat', '#brandchat']);
      });

      it("should not change the subjectsPendingDisconnection list", function() {
        expect(cb.subjectsPendingDisconnection).toEqual(['#brandchat']);
      });
    });
  });

  describe("with .hasSubject", function() {
    it("should be false when empty", function() {
      expect(cb.hasSubject('foo')).toBe(false);
    });

    it("should be false when no matches", function() {
      cb.subjects = ['litchat', 'nurph']
      expect(cb.hasSubject('foo')).toBe(false);
    });

    it("should be true when there is a match", function() {
      cb.subjects = ['litchat', 'nurph']
      expect(cb.hasSubject('nurph')).toBe(true);
    });
  });

  describe("with .hasWhiteListedSource", function() {
    it("should be true for web", function() {
      var tweet = { source: "nurph" };
      expect(cb.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should be true for web", function() {
      var tweet = { source: "blah WEB blah" };
      expect(cb.hasWhiteListedSource(tweet)).toBe(true);
    });
    
    it("should be true for hubspot", function() {
      var tweet = { source: "blahhubspot" };
      expect(cb.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should be true for tweetdeck (with full url)", function() {
      var tweet = { source: '<a href=https://about.twitter.com/products/tweetdeck" rel="nofollow">TweetDeck</a>' };
      expect(cb.hasWhiteListedSource(tweet)).toBe(true);
    });

    it("should not be true for tenchotweeter", function() {
      var tweet = { source: "tenchotweeter" };
      expect(cb.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for an undefined source", function() {
      var tweet = {};
      expect(cb.hasWhiteListedSource(tweet)).toBe(false);
    });

    it("should not be true for a null tweet", function() {
      var tweet = {};
      expect(cb.hasWhiteListedSource(tweet)).toBe(false);
    });
  });

});
