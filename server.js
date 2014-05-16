var util = require('util');
var url = require("url");
var crypto = require("crypto");

var Pusher = require('pusher');
var express = require("express");
var raven = require('raven');

var auth = require("./web_hooks_auth");
var ChannelBank = require('./channelbank');
var ChannelRegulator = require("./channelregulator");

var appTitle = "Filtrand";

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});

//let sentry catch all global errors //NOTE: there is a seperate middleware on 
//express, but that's not catching issues with the channelRegulator/channelBank
var sentry = new raven.Client(process.env.SENTRY_DSN);
sentry.patchGlobal(function() {
  console.log('(server) killing application after unexpected error');
  process.exit(1);
});

var pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET
});

var channelRegulator = new ChannelRegulator(ChannelBank, pusher, JSON.parse(process.env.TWITTER_ACCOUNTS));

// setup server
var app = express.createServer();
// static content middleware
app.use(express.static(__dirname + '/public'));
// web hooks auth middleware, keep before body parser
app.use(auth.getAuthMiddleware(process.env.PUSHER_KEY, process.env.PUSHER_SECRET));
// body parser
app.use(express.bodyParser());
// use raven/sentry for error handing
app.use(raven.middleware.express(process.env.SENTRY_DSN));

// routes

// main page
app.get("/", function (req, res) {
  var returnVars = {
    key: process.env.PUSHER_KEY,
    layout: false,
    appTitle: appTitle,
    currentSubjects: channelRegulator.currentSubjects(),
    pendings: channelRegulator.subjectsPendingDisconnection()
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

    if (event == "channel_occupied") {
      channelRegulator.track(channel);
    } else if (event == "channel_vacated") {
      channelRegulator.untrack(channel);
    }
  }

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
          channelRegulator.track(channel);
        } else if (event == "channel_vacated") {
          console.log("ManualHook dispatched untrack request:"+channel);
          channelRegulator.untrack(channel);
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
