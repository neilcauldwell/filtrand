var util = require('util');
var _ = require('underscore');

var NTwitter = require('ntwitter');
var raven = require('raven');
var sentry = new raven.Client(process.env.SENTRY_DSN);

var da = require('./data_access');
var streamerUtils = require('./streamerutils');

// uncomment for local
//Pusher.prototype.domain = 'localhost';
//Pusher.prototype.port = 8081;

// staging
//Pusher.prototype.domain = 'api.staging.pusherapp.com';

//The way the streamer works is that every time we want to track a 
//new channel it reconnects to twitter with the list of all the channels
//to track.
//At each reconnectionInterval it reconnects to everything again.
//If we want to untrack a channel it gets added to the pending diconnection
//list and when the reconnection interval comes up it doesn't try to reconnect
//to it. We do it that way so we don't have excessive twitter connections
//if a channel is tracked and untracked repeatedly within a few minutes.


var PERIODIC_CHANNEL_CHECK_INTERVAL = 30000; //30 seconds
var CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE = 60000; //60 second

var ChannelRegulator = module.exports = function(ChannelBank, pusher, twitterAccounts) {
  this.hasInitiatedTracking = false;
  this.pusher = pusher;
  this.channelBanks = twitterAccounts.map(function(account) {
    return new ChannelBank(pusher, NTwitter, account);
  });
  this.initPeriodicChannelCheck();
};

ChannelRegulator.prototype.initPeriodicChannelCheck = function() {
  this.ensurePusherChannelsAreTracked();
  this.periodicChannelCheckId = 
    setInterval(this.ensurePusherChannelsAreTracked.bind(this), PERIODIC_CHANNEL_CHECK_INTERVAL);
};

//TODO: this only adds missing/pending channels. It will never remove channels 
//if they shouldn't be tracked. That should only happen if we miss a unoccupied
//event somehow. We should probably enhance this at some point to remove excess
//channels
ChannelRegulator.prototype.ensurePusherChannelsAreTracked = function() {
  var that = this;
  console.log('Ensuring pusher channels are tracked'); 
  this.pusher.get({ path: '/channels', params: {}}, function( error, request, response ) {
    if (error) { 
      var msg = "Failed to load existing pusher channels with error: " + error;
      console.log(msg); 
      sentry.captureError(msg);

    } else if( response.statusCode === 200 ) {
      var result = JSON.parse( response.body );
      var receivedChannels = Object.keys(result.channels);
      console.log(receivedChannels);
      var receivedChannels = receivedChannels.filter(streamerUtils.isTrackableChannel);
      var trackedChannels = that.currentChannels();
      var pendingChannels = that.channelsPendingDisconnection();

      console.log("tracking " + trackedChannels.length + "/" + receivedChannels.length + " trackable channels" );

      //we want to re-track any pending channels that may have been re-added
      var pendingChannels = _.intersection(receivedChannels, pendingChannels);
      //we want to track the channels we're not already tracking (missing)
      var missingChannels = _.difference(receivedChannels, trackedChannels);

      var toTrack = _.union(missingChannels, pendingChannels)
      if (toTrack.length) {
        console.log("found channels we should be tracking: " + util.inspect(toTrack));
        that.track(toTrack);
      }
    }
  });
};

// start tracking passed subject, can be a single channel, or an array of channels
ChannelRegulator.prototype.track = function(channels) {
  if (channels == null) { return; }
  if (!Array.isArray(channels)) { channels = [channels]; }
  channels = channels.filter(streamerUtils.isTrackableChannel);
  var subjects = channels.map( function (c) { return streamerUtils.channelToSubject(c).toLowerCase(); });

  //on setup we want to split the channels evenly between the accounts to
  //get started
  if (!this.hasInitiatedTracking) {
    var subjectsPerAccount = Math.ceil(subjects.length / this.channelBanks.length);
    var remainingSubjects = subjects;
    this.channelBanks.forEach( function(cb) {
      if (remainingSubjects.length) {
        cb.track(remainingSubjects.splice(0, subjectsPerAccount));
      }
    });

    this.hasInitiatedTracking = true;
    return;
  }

  //firstly see if any subjects are pending disconnects. If they are we want to 
  //send the track call to the bank that has the pending disconnect
  this.channelBanks.forEach(function(cb) {
    var pendingDisconnections = _.intersection(subjects, cb.subjectsPendingDisconnection);
    if (pendingDisconnections.length) {
      cb.track(pendingDisconnections);
      subjects = _.difference(subjects, cb.subjectsPendingDisconnection);
    }
  });

  //now remove any we're already tracking
  subjects = _.difference(subjects, this.currentSubjects());

  if (!subjects.length) { return; } //nothing to track

  //Now we can start tracking new channels

  //we'd rather not add to a bank if the bank reconnected to twitter in the last 
  //minute. So get a list of the ones that haven't reconnected recently
  var olderThanCutoff = this.channelBanks.filter(function(cb) {
    return cb.twitterReconnectionTime < Date.now() - CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE;
  });

  //from the older items, we want to use the one with the least amount of channels
  if (olderThanCutoff.length) {
    var bySubjectLength = olderThanCutoff.sort(function(a, b) { 
      return a.subjects.length - b.subjects.length; });

    bySubjectLength[0].track(subjects);

  } else {
    //otherwise add it the channel with the oldest twitterReconnectionTime
    var byConnectionTime = this.channelBanks.slice(0).sort(function(a, b) { //slice(0) to clone
      return a.twitterReconnectionTime - b.twitterReconnectionTime; });

    byConnectionTime[0].track(subjects);
  }
};

// stop tracking passed subject
ChannelRegulator.prototype.untrack = function(channel) {
  if (!streamerUtils.isTrackableChannel(channel)) { return; }
  var subject = streamerUtils.channelToSubject(channel).toLowerCase();

  //find out what channelbank is tracking the channel if any, and
  //tell them to untrack it.
  var bankWithSubject = _.find(this.channelBanks, function(cb) { return _.contains(cb.subjects, subject); });
  if (bankWithSubject) {
    bankWithSubject.untrack(subject); 
  }
  //if there was no bank tracking the subject just ignore it
};

ChannelRegulator.prototype.currentSubjects = function() {
  var subjects = [];
  this.channelBanks.forEach(function(cb) {
    subjects = subjects.concat(cb.subjects);
  });
  return subjects;
};

ChannelRegulator.prototype.subjectsPendingDisconnection = function() {
  var pending = [];
  this.channelBanks.forEach(function(cb) {
    pending = pending.concat(cb.subjectsPendingDisconnection);
  });
  return pending;
};

ChannelRegulator.prototype.currentChannels = function() {
  var subjects = this.currentSubjects();
  var channels = subjects.map(function(subject) { 
    return streamerUtils.subjectToChannel(subject); });
  return channels;
};

ChannelRegulator.prototype.channelsPendingDisconnection = function() {
  var subjects = this.subjectsPendingDisconnection();
  var channels = subjects.map(function(subject) { 
    return streamerUtils.subjectToChannel(subject); });
  return channels;
};

ChannelRegulator.prototype.clear = function() {
  clearInterval(this.periodicChannelCheckId);
};

ChannelRegulator.CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE = CUTOFF_DURATION_FOR_ASSIGNING_BY_SIZE;
