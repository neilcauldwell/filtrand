var util = require('util');
var _ = require('underscore');

var raven = require('raven');
var sentry = new raven.Client(process.env.SENTRY_DSN);

var da = require('./data_access');
var streamerUtils = require('./streamerutils');

//all lowercase.
var tweetSourceWhiteList = [
  "twitter for iphone",
  "web",
  "twitter for android",
  "twitter web client",
  "https://mobile.twitter.com", //mobile web (m2), mobile web (m5) 
  "tweetdeck",
  "hootsuite",
  "twitter for ipad",
  "tweet button",
  "nurph",
  "twitter for blackberry",
  "instagram", 
  "oneqube",
  "dlvr.it",
  "tumblr",
  "facebook", 
  "twubs",
  "https://twitter.com/download/android", //twitter for  android (notice the space, this is different from "twitter for android")
  "ios",
  "tweetadder v4",
  "twitter for windows phone",
  "buffer",
  "twitterfeed", 
  "echofon",
  "twittelator",
  "sprout social",
  "roundteam",
  "tweetcaster",
  "twitter for mac",
  "tchat.io",
  "http://chatsalad.com",
  "ubersocial",
  "http://twitter.com/devices", //txt
  "plume for android",
  "twitter for windows",
  "blaq for blackberry® 10",
  "storify",
  "http://tapbots.com/software/tweetbot/mac", //tweetbot for mac
  "futuretweets v3",
  "sharedby",
  "socialengage",
  "socialoomph",
  "scoop.it",
  "janetter", 
  "hubspot",
  "seesmic", 
  "brizzly", 
  "twhirl", 
  "tweetie", 
  "twitterific", 
  "metrotwit", 
  "triberr", 
  "smqueue", 
  "tweeting machine", 
  "twitter web client",
  "marketmesuite",
  "paper.li",
  "manageflitter",
  "sendible",
  "chirpstory",
  "tweetro+"
];

var ChannelBank = module.exports  = function(pusher, NTwitter, twitterAccount) {
  this.pusher = pusher;
  this.NTwitter = NTwitter;
  if (twitterAccount) {
    this.twitter_consumer_key = twitterAccount.twitter_consumer_key;
    this.twitter_consumer_secret = twitterAccount.twitter_consumer_secret;
    this.twitter_access_token_key = twitterAccount.twitter_access_token_key;
    this.twitter_access_token_secret = twitterAccount.twitter_access_token_secret;
  }

  this.subjects = [];
  this.subjectsPendingDisconnection = [];
  this.reconnectionInterval = 600000; //10 minutes
  this.activeStream = null; //the twitter stream
  this.twitterReconnectionTime = Date.now();

  this.initiateReconnectionTimer();
  return this;
};

// start tracking passed subject, can be a single channel, or an array of channels
ChannelBank.prototype.track = function(subjectlist) {
  var that = this;
  if (subjectlist == null || subjectlist.length === 0) { return; }
  var newToTrack = subjectlist.filter(function (s) { return !_.contains(that.subjects, s); });
  var pendingToTrack = subjectlist.filter(function (s) { return _.contains(that.subjectsPendingDisconnection, s); });

  if (newToTrack.length) {
    newToTrack.forEach(function (subject) {
      that.emitEvent("subjects", "subject-subscribed", { type: "subject-subscribed", subject: subject });
      that.subjects.push(subject);
      console.log("now tracking channel: " + subject + " on twitter account: '" + that.twitter_consumer_key + "'");
    });

    this.ntwitterConnect();
  }

  if (pendingToTrack.length) {
    pendingToTrack.forEach(function (subject) {
      that.emitEvent("subjects", "subject-subscribed", { type: "subject-subscribed", subject: subject });
      console.log("no longer pending disconnection for:" + subject + " on twitter account: '" + that.twitter_consumer_key + "'");
      that.subjectsPendingDisconnection.splice(that.subjectsPendingDisconnection.indexOf(subject), 1);
    });
  }
};

// stop tracking passed subject
ChannelBank.prototype.untrack = function(subject) {
  var channelName = streamerUtils.subjectToChannel(subject);

  if (_.contains(this.subjects, subject)) {
    this.emitEvent("subjects", "subject-unsubscribed", { type: "subject-unsubscribed", channel: channelName, subject: subject });

    if (!_.contains(this.subjectsPendingDisconnection, subject)) {
      this.subjectsPendingDisconnection.push(subject);
    }
  }
};

ChannelBank.prototype.hasSubject = function(name) {
  return _.contains(this.subjects, name);
};

ChannelBank.prototype.initiateReconnectionTimer = function() {
  var that = this;
  this.reconnectionTimerId =  setInterval(function() {
    that.reconnect();
  }, this.reconnectionInterval);
};

ChannelBank.prototype.reconnectableSubjects = function() {
  for (var i = 0; i < this.subjectsPendingDisconnection.length; i++) {
    this.subjects.splice(this.subjects.indexOf(this.subjectsPendingDisconnection[i]), 1);
  }
  return subjects;
};

ChannelBank.prototype.reconnect = function() {
  var subjects = this.reconnectableSubjects();
  if ((this.subjectsPendingDisconnection.length > 0)) {
    console.log("Initiating reconnect and clearing out pending disconnects for: " + util.inspect(this.subjectsPendingDisconnection) + " on twitter account: '" + this.twitter_consumer_key + "'");
    this.ntwitterConnect();
    this.subjectsPendingDisconnection = [];
  }
};

ChannelBank.prototype.hasWhiteListedSource = function(tweet) {
  if (!tweet || !tweet.source) { return false; }
  var tweetsource = tweet.source.toLowerCase();
  for (var i = 0; i < tweetSourceWhiteList.length; i++) {
    if (tweetsource.indexOf(tweetSourceWhiteList[i]) != -1) {
      return true;
    }
  }
  return false;
};

ChannelBank.prototype.tweetEmitter = function(tweet) {
  if (tweet.text == undefined) {
    da.store_received_tweet(tweet, null, false, "tweet object has undefined text field");
    return;
  }

  var text = tweet.text.toLowerCase();

  //only emit tweets with a whitelisted source
  if (!this.hasWhiteListedSource(tweet)) {
    console.log("Received non-whitelisted tweet with text: " + tweet.text);
    for (var i in this.subjects) {
      if (text.indexOf(this.subjects[i]) != -1) {
        da.store_received_tweet(tweet, this.subjects[i], false, "source not on whitelist");
      }
    }
    return;
  }

  console.log("Received whitelisted tweet with text: " + tweet.text);
  for (var i in this.subjects) {
    if (text.indexOf(this.subjects[i]) != -1) {
      this.emitTweet(this.subjects[i], tweet);
      da.store_received_tweet(tweet, this.subjects[i], true);
    }
  }
};

ChannelBank.prototype.emitTweet = function(subject, tweet) {
  var channel = streamerUtils.subjectToChannel(subject);
  this.emitEvent(
    channel,
    "tweet",
    {
      type: 'tweet',
      channel: channel,

      id: tweet.id_str,
      id_str: tweet.id_str,
      tweet_id: tweet.id_str,
      created_at: tweet.created_at,
      text: tweet.text,
      truncated: tweet.truncated,
      favorited: tweet.favorited,
      in_reply_to_twitter_user_id_str: tweet.in_reply_to_user_id_str,
      in_reply_to_status_id: tweet.in_reply_to_status_id,
      in_reply_to_status_id_str: tweet.in_reply_to_status_id_str,
      retweet_count: tweet.retweet_count,
      retweeted: tweet.retweet,
      possibly_sensitive: tweet.possibly_sensitive,
      in_reply_to_twitter_user_id: tweet.in_reply_to_user_id,
      source: tweet.source,
      in_reply_to_screen_name: tweet.in_reply_to_screen_name,
      entities: tweet.entities,
      contributors: tweet.contributors,
      coordinates: tweet.coordinates,

      geo: tweet.geo,
      place: tweet.place,
      retweeted_status: tweet.retweeted_status,
      hashtags: tweet.entities.hashtags,
      urls: tweet.entities.urls,
      user_mentions: tweet.entities.user_mentions,
      media: tweet.entities.media,

      twitter_id: tweet.user.id,
      sender_id: tweet.user.id,
      screen_name: tweet.user.screen_name,
      profile_image_url: tweet.user.profile_image_url,

      sender: {
        id: tweet.user.id,
        twitter_id: tweet.user.id,
        display_name: tweet.user.screen_name,
        screen_name: tweet.user.screen_name,
        avatar_url: tweet.user.profile_image_url,
        profile_image_url: tweet.user.profile_image_url
      }
    }
  );
};

ChannelBank.prototype.emitEvent = function(channel, event, data) {
  var that = this;
  this.pusher.trigger(channel, event, data, null, function(err, req, res) {
    if (err) {
      console.log("Could not emit event on Pusher API.", err);
      sentry.captureError("Failed to emit Pusher event with error: " + err,
        {extra: {channel: channel, data: JSON.stringify(data), twitter_account: that.twitter_consumer_key}});
    }
    else {
      //console.log("Emitted tweet about " + subject + ": " + tweet.text)
    }
  });
};

ChannelBank.prototype.killOldStream = function killOldStream(oldStream) {
  var that = this;
  //wait 5 seconds before killing the old stream to let the new stream take effect
  setTimeout(function() { 
    if (oldStream && oldStream !== that.activeStream) {
      //don't kill it if it's still active, (such as on a connection error)
      oldStream.destroy(); 
    } else if (oldStream && oldStream === that.activeStream) {
      //if it's still active we'll want to kill it eventually, so keep retrying
      that.killOldStream(oldStream);
    }
  }, 5000);
};

ChannelBank.prototype.ntwitterConnect = function() {
  var that = this;
  //TODO: we should process any pending disconnects and remove them from the disconnect
  //list before we do the actual reconnection
  
  //if we are waiting to reconnect because of an error don't do anything.
  if (this.errorReconnectTimeoutId) {
    console.log("Skipping reconnect because we are waiting for an error timeout on twitter account: '" + this.twitter_consumer_key + "'");
    sentry.captureError("Skipping reconnect because we are waiting for an error timeout",
      {level: 'info', extra: {subjects: JSON.stringify(this.subjects), twitter_account: this.twitter_consumer_key}});
    return;
  }

  //if there is an existing stream we'll want to kill it
  if (this.activeStream) {
    this.killOldStream(this.activeStream);
  }

  ntwit = new this.NTwitter({
    consumer_key: this.twitter_consumer_key,
    consumer_secret: this.twitter_consumer_secret,
    access_token_key: this.twitter_access_token_key,
    access_token_secret: this.twitter_access_token_secret
  });

  console.log("ntwitterConnect with subjects" + util.inspect(this.subjects)  + " on twitter account: '" + this.twitter_consumer_key + "'");
  ntwit.stream('statuses/filter', { track: this.subjects }, function(stream) {
    var dataReceived = false;
    stream.on('data', function (data) {
      if (!dataReceived) {
        dataReceived = true;
        that.activeStream = stream;
      }
      that.tweetEmitter(data);
    });
    stream.on('end', function (response) { console.log("ntwitter.stream Ended") });
    stream.on('destroy', function (response) { console.log("ntwitter.stream Destroyed") });
    stream.on('error', function (err, statusCode) { 
      statusCode = statusCode || 200;
      console.log("ntwitter.stream Error: " + err + " StatusCode: " + statusCode + " on twitter account: '" + that.twitter_consumer_key + "'"); 
      sentry.captureError("ntwitter.stream Error: " + JSON.stringify(err) + " StatusCode: " + statusCode,
        {extra: {subjects: JSON.stringify(that.subjects), statusCode: statusCode, twitter_account: that.twitter_consumer_key}});

      //try to reconnect if we get an rate limit error
      if (statusCode === 420 || statusCode === 429) {
        //we want to keep the previous stream active and kill this one
        if (that.activeStream === stream) { that.activeStream = null; }
        stream.destroy();
        that.errorReconnectTimeoutId = setTimeout(function() { 
          console.log("Attempting to reconnect to twitter after rate limit error");
          sentry.captureError("Attempting to reconnect to twitter after rate limit error",
            {level: 'info', extra: {subjects: JSON.stringify(that.subjects), twitter_account: that.twitter_consumer_key}});
          that.errorReconnectTimeoutId = null;
          that.ntwitterConnect();
        }, 30000); //30 secs
      }

      //try to reconnect if we get a server error
      if (statusCode === 501 || statusCode === 503 || statusCode === 504) {
        //we want to keep the previous stream active and kill this one
        if (that.activeStream === stream) { that.activeStream = null; }
        stream.destroy();
        that.errorReconnectTimeoutId = setTimeout(function() { 
          console.log("Attempting to reconnect to twitter after server error");
          sentry.captureError("Attempting to reconnect to twitter after server error",
            {level: 'error', extra: {subjects: JSON.stringify(that.subjects), twitter_account: that.twitter_consumer_key}});
          that.errorReconnectTimeoutId = null;
          that.ntwitterConnect();
        }, 10000); //10 secs
      }
    });
  });

  this.twitterReconnectionTime = Date.now();
};

ChannelBank.prototype.clear = function() {
  clearInterval(this.reconnectionTimerId);
  clearTimeout(this.errorReconnectTimeoutId);
};

