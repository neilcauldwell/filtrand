var util = require('util');
var _ = require('underscore');

var Pusher = require('pusher');
var raven = require('raven');
var sentry = new raven.Client(process.env.SENTRY_DSN);

var da = require('./data_access');
var streamerUtils = require('./streamerutils');
var ChannelBank = require('./channelbank');

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


var channelCheckInterval = 30000; //30 seconds
var assignBySizeCutoff = 60000; //60 second


var ChannelRegulator = module.exports = function(pusher, twitterAccount) {
  this.channelBanks = [];
  thist.hasInitiatedTracking = false;

  this.pusher = pusher;
  for (var account in twitterAccounts) {
    var cb = new ChannelBank(pusher, account);
    this.channelBanks.append(cb);
  };
  this.initPeriodicChannelCheck();
};


ChannelRegulator.prototype.initPeriodicChannelCheck = function() {
  this.ensurePusherChannelsAreTracked();
  setInterval(this.ensurePusherChannelsAreTracked, channelCheckInterval);
};

ChannelRegulator.prototype.ensurePusherChannelsAreTracked = function() {
  console.log('Ensuring pusher channels are tracked'); 
  pusher.get({ path: '/channels', params: {}}, function( error, request, response ) {
    if (error) { 
      var msg = "Failed to load existing pusher channels with error: " + error;
      console.log(msg); 
      sentry.captureError(msg);

    } else if( response.statusCode === 200 ) {
      var result = JSON.parse( response.body );
      var receivedChannels = Object.keys(result.channels);
      var receivedChannels = receivedChannels.filter(streamerUtils.isTrackableChannel);
      var trackedChannels = this.currentChannels();

      console.log("tracking " + trackedChannels.length + "/" + receivedChannels.length + " trackable channels" );

      //we only want to track the channels we're not already tracking
      var missingChannels = _.difference(receivedChannels, trackedChannels);
      if (missingChannels.length) {
        console.log("found missing channels we should be tracking: " + util.inspect(missingChannels));
        this.track(missingChannels);
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
    var subjectsPerAccount = Math.ceil(subjects / this.channelBanks);
    var remainingSubjects = subjects;
    this.channelBanks.forEach( function(cb) {
      cb.track(remainingSubjects.splice(0, subjectsPerAccount));
    });

    this.hasInitiatedTracking = true;
    return;
  }

  //firstly remove any we're already tracking
  subjects = _.difference(subjects, this.currentSubjects());

  //next see if any of them are pending disconnects. If they are we want to 
  //send the track call to the bank that has the pending disconnect
  this.channelBanks.foreach( function(cb) {
    var pendingDisconnections = _.intersection(subjects, this.channelBanks.subjectsPendingDisconnection);
    cb.track(pendingDisconnections);
    subjects = _.difference(subjects, this.channelBanks.subjectsPendingDisconnection);
  });

  //Now we can start tracking new channels

  //we'd rather not add to a bank if the bank reconnected to twitter in the last 
  //minute. So get a list of the ones that haven't reconnected recently
  var olderThanCutoff = this.channelBanks.filter(function(cb) {
    return cb.twitterReconnectionTime < Date.now() - assignBySizeCutoff;
  });

  //from the older items, we want to use the one with the least amount of channels
  if (olderThanCutoff.length) {
    var bySubjectLength = olderThanCutoff.sort(function(a, b) { 
      return a.subjects.length - b.subjects.length; });

    bySubjectLength[0].track(subjects);

  } else {
    //otherwise add it the channel with the oldest twitterReconnectionTime
    var byConnectionTime = this.channelBanks.sort(function(a, b) { 
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
  var bankWithSubject = _.find(this.channelBanks, function(cb) { 
    return cb.hasSubject(subject) || cb.hasPendingDisconnectionSubject(subject); });

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


