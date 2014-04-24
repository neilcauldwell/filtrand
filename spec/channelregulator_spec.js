var sinon = require("sinon"); //for function stubs with callbacks.

var ChannelRegulator = require("../channelregulator");

describe("for ChannelRegulator", function() {
  var sentry;

  beforeEach(function() {
    sentry = jasmine.createSpyObj('sentry', ['captureMessage', 'captureError']);
  });

  describe("with .constructor", function() {
    var cr, ChannelBank, twitterAccounts, pusher = { pusher: 'pusher' }, cb = { channelbank: 'channelbank' };

    beforeEach(function() {
      twitterAccounts = [{accountNo: '1'}, {accountNo: '2'}, {accountNo: '3'}];
      ChannelBank = jasmine.createSpy();
      spyOn(ChannelRegulator.prototype, "initPeriodicChannelCheck");
      cr = new ChannelRegulator(ChannelBank, pusher, twitterAccounts);
    });

    afterEach(function() {
      cr.clear();
    });

    it("should create a channel bank for each twitter account", function() {
      expect(ChannelBank).toHaveBeenCalledWith(pusher, jasmine.any(Function), twitterAccounts[0]);
      expect(ChannelBank).toHaveBeenCalledWith(pusher, jasmine.any(Function), twitterAccounts[1]);
      expect(ChannelBank).toHaveBeenCalledWith(pusher, jasmine.any(Function), twitterAccounts[2]);
      expect(cr.channelBanks.length).toEqual(3);
    });

    it("should set hasInitiatedTracking to false", function() {
      expect(cr.hasInitiatedTracking).toEqual(false);
    });

    it("should set hasInitiatedTracking to false", function() {
      expect(cr.initPeriodicChannelCheck).toHaveBeenCalled();
    });
  });

  describe("with .track", function() {
    var cr;

    beforeEach(function() {
      spyOn(ChannelRegulator.prototype, "initPeriodicChannelCheck"); //we don't want it to do the init
      cr = new ChannelRegulator(null, null, []);
    });

    afterEach(function() {
      cr.clear();
    });

    describe("for the initial .track call", function() {

      describe("with a single channel bank", function() {

        beforeEach(function() {
          cr.channelBanks[0] = {subjects: [], track: function() {}};
          spyOn(cr.channelBanks[0], "track");
          cr.track(["litchat", "seochat"]);
        });

        it("should call track on the first channel bank with all channels", function() {
          expect(cr.channelBanks[0].track).toHaveBeenCalledWith(["#litchat", "#seochat"]);
        });
      });

      describe("with 4 channel banks and 2 channels", function() {

        beforeEach(function() {
          cr.channelBanks[0] = {subjects: [], track: function() {}};
          cr.channelBanks[1] = {subjects: [], track: function() {}};
          cr.channelBanks[2] = {subjects: [], track: function() {}};
          cr.channelBanks[3] = {subjects: [], track: function() {}};
          spyOn(cr.channelBanks[0], "track");
          spyOn(cr.channelBanks[1], "track");
          spyOn(cr.channelBanks[2], "track");
          spyOn(cr.channelBanks[3], "track");
          cr.track(["litchat", "seochat"]);
        });

        it("should call track on the first two channel banks", function() {
          expect(cr.channelBanks[0].track).toHaveBeenCalledWith(["#litchat"]);
          expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#seochat"]);
          expect(cr.channelBanks[2].track).not.toHaveBeenCalled();
          expect(cr.channelBanks[3].track).not.toHaveBeenCalled();
        });
      });

      describe("with 3 channel banks and 8  channels", function() {

        beforeEach(function() {
          cr.channelBanks[0] = {subjects: [], track: function() {}};
          cr.channelBanks[1] = {subjects: [], track: function() {}};
          cr.channelBanks[2] = {subjects: [], track: function() {}};
          spyOn(cr.channelBanks[0], "track");
          spyOn(cr.channelBanks[1], "track");
          spyOn(cr.channelBanks[2], "track");
          cr.track(["litchat", "seochat", "nurphchat", "foochat", "barchat", "fizzchat", "bazchat", "ninechat"]);
        });

        it("should call track on the first two channel banks", function() {
          expect(cr.channelBanks[0].track).toHaveBeenCalledWith(["#litchat", "#seochat", "#nurphchat"]);
          expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#foochat", "#barchat", "#fizzchat"]);
          expect(cr.channelBanks[2].track).toHaveBeenCalledWith(["#bazchat", "#ninechat"]);
        });
      });

      describe("with 2 channel banks and 0 channels", function() {

        beforeEach(function() {
          cr.channelBanks[0] = {subjects: [], track: function() {}};
          cr.channelBanks[1] = {subjects: [], track: function() {}};
          spyOn(cr.channelBanks[0], "track");
          spyOn(cr.channelBanks[1], "track");
          cr.track([]);
        });

        it("should not call track on any channels", function() {
          expect(cr.channelBanks[0].track).not.toHaveBeenCalled();
          expect(cr.channelBanks[1].track).not.toHaveBeenCalled();
        });
      });
    });

    describe("with existing channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], track: function() {}};
        cr.channelBanks[1] = {subjects: ["#seochat"], subjectsPendingDisconnection: [], track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        cr.track(["litchat", "seochat"]);
      });

      it("should not call track on any channels", function() {
        expect(cr.channelBanks[0].track).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].track).not.toHaveBeenCalled();
      });
    });

    describe("with pending channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#seochat"], subjectsPendingDisconnection: ["#seochat"], track: function() {}};
        cr.channelBanks[1] = {subjects: ["#litchat"], subjectsPendingDisconnection: ["#litchat"], track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        cr.track(["litchat", "seochat"]);
      });

      it("should call track on the matching disconnect channels", function() {
        expect(cr.channelBanks[0].track).toHaveBeenCalledWith(["#seochat"]);
        expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#litchat"]);
      });
    });

    describe("with existing and pending channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#seochat", "#scifichat"], subjectsPendingDisconnection: ["#seochat"], track: function() {}};
        cr.channelBanks[1] = {subjects: ["#litchat", "#foochat"], subjectsPendingDisconnection: ["#litchat"], track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        cr.track(["litchat", "seochat", "scifichat", "foochat"]);
      });

      it("should call track only for the pending disconnect channels", function() {
        expect(cr.channelBanks[0].track).toHaveBeenCalledWith(["#seochat"]);
        expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#litchat"]);
      });
    });

    describe("with all channel banks older than the cutoff", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#seochat", "#scifichat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - ChannelRegulator.CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE - 10,
          track: function() {}};
        cr.channelBanks[1] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - ChannelRegulator.CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE - 10,
          track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        cr.track(["foochat", "barchat"]);
      });

      it("should call track on the shortest channelBank", function() {
        expect(cr.channelBanks[0].track).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#foochat", "#barchat"]);
      });
    });

    describe("with some channel banks older than the cutoff", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#seochat", "#scifichat", "#fizzchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - ChannelRegulator.CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE - 10,
          track: function() {}};
        cr.channelBanks[1] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now(),
          track: function() {}};
        cr.channelBanks[2] = {subjects: ["#litchat", "#bazchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - ChannelRegulator.CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE - 10,
          track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        spyOn(cr.channelBanks[2], "track");
        cr.track(["foochat", "barchat"]);
      });

      it("should call track on the shortest channelBank, that is older than the cutoff", function() {
        expect(cr.channelBanks[0].track).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].track).not.toHaveBeenCalled();
        expect(cr.channelBanks[2].track).toHaveBeenCalledWith(["#foochat", "#barchat"]);
      });
    });

    describe("with all channels newer than the cutoff", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#seochat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now(),
          track: function() {}};
        cr.channelBanks[1] = {subjects: ["#litchat", "#scifichat", "#fizzchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - 100,
          track: function() {}};
        cr.channelBanks[2] = {subjects: ["#litchat", "#bazchat"], subjectsPendingDisconnection: [], 
          twitterReconnectionTime: Date.now() - 50,
          track: function() {}};
        spyOn(cr.channelBanks[0], "track");
        spyOn(cr.channelBanks[1], "track");
        spyOn(cr.channelBanks[2], "track");
        cr.track(["foochat", "barchat"]);
      });

      it("should call track on the oldest updated channel bank", function() {
        expect(cr.channelBanks[0].track).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].track).toHaveBeenCalledWith(["#foochat", "#barchat"]);
        expect(cr.channelBanks[2].track).not.toHaveBeenCalled();
      });
    });
  });

  describe("with .untrack", function() {
    var cr;

    beforeEach(function() {
      spyOn(ChannelRegulator.prototype, "initPeriodicChannelCheck"); //we don't want it to do the init
      cr = new ChannelRegulator(null, null, []);
    });

    afterEach(function() {
      cr.clear();
    });

    describe("when no channel bank has the channel", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], untrack: function() {}};
        cr.channelBanks[1] = {subjects: ["#seochat"], subjectsPendingDisconnection: [], untrack: function() {}};
        spyOn(cr.channelBanks[0], "untrack");
        spyOn(cr.channelBanks[1], "untrack");
        cr.untrack(["foochannel"]);
      });

      it("should not call untrack", function() {
        expect(cr.channelBanks[0].untrack).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].untrack).not.toHaveBeenCalled();
      });
    });

    describe("when a channel bank has the channel", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], untrack: function() {}};
        cr.channelBanks[1] = {subjects: ["#seochat"], subjectsPendingDisconnection: [], untrack: function() {}};
        spyOn(cr.channelBanks[0], "untrack");
        spyOn(cr.channelBanks[1], "untrack");
        cr.untrack(["litchat"]);
      });

      it("should call untrack on the bank with the channel", function() {
        expect(cr.channelBanks[0].untrack).toHaveBeenCalledWith("#litchat");
        expect(cr.channelBanks[1].untrack).not.toHaveBeenCalled();
      });
    });

    describe("when a channel bank has the channel and is pending", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat"], subjectsPendingDisconnection: [], untrack: function() {}};
        cr.channelBanks[1] = {subjects: ["#seochat"], subjectsPendingDisconnection: ["#seochat"], untrack: function() {}};
        spyOn(cr.channelBanks[0], "untrack");
        spyOn(cr.channelBanks[1], "untrack");
        cr.untrack(["seochat"]);
      });

      it("should call untrack on the bank with the channel", function() {
        expect(cr.channelBanks[0].untrack).not.toHaveBeenCalled();
        expect(cr.channelBanks[1].untrack).toHaveBeenCalledWith("#seochat");
      });
    });
  });

  describe("with .ensurePusherChannelsAreTracked", function() {
    var cr, pusher, spyPusher;

    beforeEach(function() {
      pusher = { get: function() {} };
      var pusherResponseBody = { "channels": {"foochat": [], "barchat": []} };
      spyPusher = sinon.stub(pusher, 'get').
        yields(null, null, { statusCode: 200, body: JSON.stringify(pusherResponseBody) });

      spyOn(ChannelRegulator.prototype, "initPeriodicChannelCheck"); //we don't want it to do the init
      cr = new ChannelRegulator(null, pusher, []);
    });

    afterEach(function() {
      cr.clear();
    });

    describe("when there are no missing channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat", "#foochat"], subjectsPendingDisconnection: [] };
        cr.channelBanks[1] = {subjects: ["#seochat", "#barchat"], subjectsPendingDisconnection: [] };
        spyOn(cr, "track");
        cr.ensurePusherChannelsAreTracked();
      });

      it("should call pusher.get", function() {
        expect(spyPusher.calledWith({ path: '/channels', params: {}}, sinon.match.func)).toBe(true);
      });

      it("should not call track", function() {
        expect(cr.track).not.toHaveBeenCalled();
      });

      it("should not call captureError", function() {
        expect(sentry.captureMessage).not.toHaveBeenCalled();
      });
    });

    describe("when there are missing channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat"], subjectsPendingDisconnection: [] };
        cr.channelBanks[1] = {subjects: ["#seochat", "#foochat"], subjectsPendingDisconnection: [] };
        spyOn(cr, "track");
        cr.ensurePusherChannelsAreTracked();
      });

      it("should call pusher.get", function() {
        expect(spyPusher.calledWith({ path: '/channels', params: {}}, sinon.match.func)).toBe(true);
      });

      it("should call track", function() {
        expect(cr.track).toHaveBeenCalledWith(["barchat"]);
      });

      it("should not call captureError", function() {
        expect(sentry.captureMessage).not.toHaveBeenCalled();
      });
    });

    describe("when there are pending and missing channels", function() {
      beforeEach(function() {
        cr.hasInitiatedTracking = true;
        cr.channelBanks[0] = {subjects: ["#litchat", "#barchat"], subjectsPendingDisconnection: ["#barchat"] };
        cr.channelBanks[1] = {subjects: ["#seochat"], subjectsPendingDisconnection: [] };
        spyOn(cr, "track");
        cr.ensurePusherChannelsAreTracked();
      });

      it("should call pusher.get", function() {
        expect(spyPusher.calledWith({ path: '/channels', params: {}}, sinon.match.func)).toBe(true);
      });

      it("should call track", function() {
        expect(cr.track).toHaveBeenCalledWith(["foochat", "barchat"]);
      });

      it("should not call captureError", function() {
        expect(sentry.captureMessage).not.toHaveBeenCalled();
      });
    });
  });
});
