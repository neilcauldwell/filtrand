var pg = require('pg');
var sql = require('sql');
var raven = require('raven');
var sentry = new raven.Client(process.env.SENTRY_DSN);

var connStr = process.env.DATABASE_URL || "postgres://filtrand_user:filtrand_user@localhost/filtrand"; 

var filtered_tweets = sql.define({
  name: 'filtered_tweets',
  columns: ['channel', 'was_emitted', 'rejected_reason', 'filtered_at',
    'created_at', 'sender', 'tweet_id', 'source', 'json_value']
});

exports.store_received_tweet = function(tweet, subject, was_emitted, reject_reason) {

  var sender = tweet.user ? tweet.user.screen_name : null;
  var created_at = tweet.created_at ? new Date(tweet.created_at) : null;
  var tweet_id = tweet.id ? tweet.id : null;
  var source = tweet.source ? tweet.source : null;

  pg.connect(connStr, function(err, client, done) {
    if (err) { 
      sentry.captureError("PG Error fetching client from pool" + err);
      return console.error('PG Error fetching client from pool', err); 
    }

    var command = 
      filtered_tweets.insert({
        channel: subject, 
        was_emitted: was_emitted, 
        rejected_reason: reject_reason,
        filtered_at: new Date(), 
        created_at: created_at,
        sender: sender,
        tweet_id: tweet_id, 
        source: source, 
        json_value: JSON.stringify(tweet)
      }).toQuery(); 
    
    client.query(command.text, command.values, function(err, result) {
      done(); //relase client back ot the connection pool
      if (err) { 
        sentry.captureError("PG Error: Failed to store received tweet with error:" + err);
        return console.error('PG Error: Failed to store received tweet with error', err); 
      }

      return console.log('command completed successfuly');
    });
  });
}
