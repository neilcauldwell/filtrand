var sys = require('sys');
var ntwitter = require('ntwitter');
var Pusher = require('node-pusher');

var subjectToChannel = {};

// uncomment for local
//Pusher.prototype.domain = 'localhost';
//Pusher.prototype.port = 8081;

// staging
//Pusher.prototype.domain = 'api.staging.pusherapp.com';

// API

var streamer = exports;
var pusher = null;
var subjects = [];
var subjectsPendingDisconnection = [];
var reconnectionInterval = 600000;
var lastConnectionTimestamp = Date.now();

// start tracking passed subject
streamer.track = function(channel) {
  var subject = streamer.channelToSubject(channel).toLowerCase();
  var channelName = subjectToChannel(subject);

  if (!includes(subject, subjects)) {
    emitEvent("subjects", "subject-subscribed", { type: "subject-subscribed", channel: channelName, subject: subject });
    subjects.push(subject);
    ntwitterConnect();

    if (includes(subject, subjectsPendingDisconnection)) {
      subjectsPendingDisconnection.splice(subjectsPendingDisconnection.indexOf(subject), 1);
    };
  };
};

// stop tracking passed subject
streamer.untrack = function(channel) {
  var subject = streamer.channelToSubject(channel).toLowerCase();
  var channelName = subjectToChannel(subject);

  if (includes(subject, subjects)) {
    emitEvent("subjects", "subject-unsubscribed", { type: "subject-unsubscribed", channel: channelName, subject: subject });

    if (!includes(subject, subjectsPendingDisconnection)) {
      subjectsPendingDisconnection.push(subject);
    };
  };
};

// setup the streamer with a Pusher connection
streamer.appSetup = function(key, secret, appId) {
  pusher = new Pusher({
    appId: appId,
    key: key,
    secret: secret
  });
};

streamer.ntwitterSetup = function(twitter_consumer_key, twitter_consumer_secret, twitter_access_token_key, twitter_access_token_secret) {
  streamer.twitter_consumer_key = twitter_consumer_key;
  streamer.twitter_consumer_secret = twitter_consumer_secret;
  streamer.twitter_access_token_key = twitter_access_token_key;
  streamer.twitter_access_token_secret = twitter_access_token_secret;
};

streamer.initiateReconnectionTimer = function() {
  setInterval(function() {
    streamer.reconnect();
  }, reconnectionInterval);
};

streamer.reconnectableSubjects = function() {
  for (var i = 0; i < subjectsPendingDisconnection.length; i++) {
    subjects.splice(subjects.indexOf(subjectsPendingDisconnection[i]), 1);
  };
  return subjects;
};

streamer.reconnect = function() {
  var subjects = streamer.reconnectableSubjects();
  if ((subjectsPendingDisconnection.length > 0)) {
    ntwitterConnect();
    subjectsPendingDisconnection = [];
  };
};

streamer.reachedReconnectionInterval = function() {
  var timeNow = Date.now();
  var result = ((timeNow - lastConnectionTimestamp) > reconnectionInterval);
  return result
};

streamer.currentSubjects = function() {
  return subjects;
};

streamer.subjectsPendingDisconnection = function() {
  return subjectsPendingDisconnection;
};

// supporting functions

streamer.subjectToChannel = function(subject) {
	subject = subject.replace(/^#/, "");
  return encodeURIComponent(subject).replace('-', '-0').replace('_', '-1')
    .replace('.', '-2').replace('!', '-3').replace('~', '-4').replace('*', '-5')
    .replace('(', '-6').replace(')', '-7')
};

streamer.channelToSubject = function(channel) {
	channel = ("#"+channel);
  return decodeURI(channel.replace('-7', ')').replace('-6', '(').replace('-5', '*')
                   .replace('-4', '~').replace('-3', '!').replace('-2', '.')
                   .replace('-1', '_').replace('-0', '-'));
};

var includes = function(item, array) {
  var included = false;
  for(var i = 0; i < array.length; i++) {
    if(item == array[i]) {
      included = true;
      break;
    };
  };

  return included;
};

var tweetEmitter = function(tweet) {
  if (tweet.text !== undefined) {
    var text = tweet.text.toLowerCase();
    for (var i in subjects) {
      if (text.indexOf(subjects[i]) != -1) {
        emitTweet(subjects[i], tweet);
      };
    };
  }
  else {
    console.log("tweetEmitter received a tweet with undefined text.");
    for (var propOne in tweet) {
      console.log("tweetEmitter received tweet." + propOne + ": " + tweet[propOne]);
      for (var propTwo in tweet[propOne]) {
        console.log("tweetEmitter received tweet." + propOne + "." + propTwo + ": " + tweet[propOne][propTwo]);
      };
    };
  };
};

var emitTweet = function(subject, tweet) {
  var channel = streamer.subjectToChannel(subject);
  emitEvent(
    channel,
    "tweet",
    { type: 'tweet',
      channel: channel,
			id: tweet.id,
			tweet_id: tweet.id_str,
      tweet_id_str: tweet.id_str,
			created_at: tweet.created_at,
			screen_name: tweet.user.screen_name,
			profile_image_url: tweet.user.profile_image_url,
			text: tweet.text,
			source: tweet.source
		  }
  );
};

var emitEvent = function(channel, event, data) {
  pusher.trigger(channel, event, data, null, function(err, req, res) {
    if (err) {
      console.log("Could not emit event on Pusher API.", err);
    }
    else {
      //console.log("Emitted tweet about " + subject + ": " + tweet.text)
    }
  });
};

var ntwitterConnect = function() {
  var ntwit = new ntwitter({
    consumer_key: streamer.twitter_consumer_key,
    consumer_secret: streamer.twitter_consumer_secret,
    access_token_key: streamer.twitter_access_token_key,
    access_token_secret: streamer.twitter_access_token_secret
  });

  ntwit.stream('statuses/filter', { track: subjects }, function(stream) {
    stream.on('data', function (data) {
      console.log("Tweet received." + data.id);
      tweetEmitter(data);
    });
    stream.on('error', function (err) { console.log(err) });
    stream.on('end', function (response) { console.log(response) });
    stream.on('destroy', function (response) { console.log(response) });
  });

  lastConnectionTimestamp = Date.now();
  console.log("ntwitterConnect completed.");
};