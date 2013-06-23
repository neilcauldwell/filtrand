var sys = require('sys');
var url = require("url");
var crypto = require("crypto");

var express = require("express");

var auth = require("./web_hooks_auth");
var streamer = require("./streamer");

var appTitle = "Filtrand";

// setup twitter streamer
streamer.appSetup(process.env.PUSHER_KEY, process.env.PUSHER_SECRET, process.env.PUSHER_APP_ID);
streamer.ntwitterSetup(process.env.TWITTER_CONSUMER_KEY, process.env.TWITTER_CONSUMER_SECRET, process.env.TWITTER_ACCESS_TOKEN_KEY, process.env.TWITTER_ACCESS_TOKEN_SECRET);
streamer.initiateReconnectionTimer();

// setup server
var app = express.createServer();
// static content middleware
app.use(express.static(__dirname + '/public'));
// web hooks auth middleware, keep before body parser
app.use(auth.getAuthMiddleware(process.env.PUSHER_KEY, process.env.PUSHER_SECRET));
// body parser
app.use(express.bodyParser());

// routes

// main page
app.get("/", function (req, res) {
  var returnVars = {
    key: process.env.PUSHER_KEY,
    layout: false,
    appTitle: appTitle,
    currentSubjects: streamer.currentSubjects(),
    pendings: streamer.subjectsPendingDisconnection()
  };

  res.render('index.jade', returnVars);
});

// receive a web hook indicating subject channel occupied or vacated
app.post("/webhooks", function (req, res) {
  if (!req.web_hook_authorized) {
    console.log("WebHook denied", req.body);
    res.send({}, 403);
    return;
  }

  console.log("WebHook received", req.body);

  var events = req.body.events;
  for (var i=0; i < events.length; i++) {
    var event = events[i].name;
    var channel = events[i].channel;
    var presencePrefix = 'presence-';

    if (channel.substring(0, presencePrefix.length) != presencePrefix) {
      if (channel != "subjects") {
        if (event == "channel_occupied") {
          streamer.track(channel);
        } else if (event == "channel_vacated") {
          streamer.untrack(channel);
        };
      };
    };
  };

  res.send({});
});

// Receive a ManualHook indicating subject channel occupied or vacated.
app.post("/manualhooks", function (req, res) {
  var given_key = req.headers['x-manualhook-key'];
  var required_key = process.env.MANUALHOOK_KEY;

  if (given_key != required_key) {
    console.log("ManualHook denied", req.body);
    res.send({}, 403);
    return;
  }

  var events = req.body.events;
  for (var i=0; i < events.length; i++) {
    var event = events[i].name;
    var channel = events[i].channel;
    var presencePrefix = 'presence-';

    if (channel.substring(0, presencePrefix.length) != presencePrefix) {
      if (channel != "subjects") {
        if (event == "channel_occupied") {
          console.log("ManualHook dispatched track request:"+channel);
          streamer.track(channel);
        } else if (event == "channel_vacated") {
          console.log("ManualHook dispatched untrack request:"+channel);
          streamer.untrack(channel);
        };
      };
    };
  };

  res.send({});
});

// run server

var port = process.env.PORT || 5000;
app.listen(port);
console.log("Listening for WebHooks on port " + port + " at " + "/webhooks")
