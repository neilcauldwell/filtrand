var pg = require('pg');
var raven = require('raven');
var util = require('util');
var sentry = new raven.Client(process.env.SENTRY_DSN);

var connStr = process.env.DATABASE_URL || "postgres://filtrand_user:filtrand_user@localhost/filtrand"; 

console.log("staring: purge tweets older than a week");

var client = new pg.Client(connStr);
client.connect(function(err) {
  if (err) { 
    sentry.captureError("PG Error connecting to postgress " + err);
    return console.error('PG Error connecting to postgress', err); 
  }

  var sqlCommand = "delete from filtered_tweets where filtered_at < current_timestamp - interval '8 days';"

  client.query(sqlCommand, function(err, result) {
    if (err) { 
      sentry.captureError("PG Error running command. " + err);
      return console.error('PG Error running command.', err); 
    }
    console.log(util.inspect(result));
    console.log("purge tweets older than a week completed");
    client.end();
  });
});

