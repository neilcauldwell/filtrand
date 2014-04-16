var util = require('util');
var fs = require('fs');
var pg = require('pg');
var sql = require('sql');

var connStr = process.env.DATABASE_URL || "postgres://postgres:pass@localhost/nurph-filtrand-production";

//var channels = [
//  "#shoutout_uk",
//  "#litchat",
//  "#printchat",
//  "#boardgamersask",
//  "#nsachat",
//  "#boardgamehour"];

var convert_tweet = function(channel, tweet) {
  return {
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
  };
}


var filtered_tweets = sql.define({
  name: 'filtered_tweets',
  columns: ['channel', 'was_emitted', 'rejected_reason', 'filtered_at',
    'created_at', 'sender', 'tweet_id', 'source', 'json_value']
});

var json_rows = [];

var channel_counts = {};
var select_filtered_games = function(callback) {

  pg.connect(connStr, function(err, client, done) {
    if (err) { 
      return console.error('PG Error fetching client from pool', err); 
    }

    var command = 
      filtered_tweets.select(filtered_tweets.channel, filtered_tweets.json_value).
      from(filtered_tweets).
      where(
        filtered_tweets.was_emitted.equals(true).and(
        filtered_tweets.source.notLike('%nurph%')).and(
        filtered_tweets.created_at.gt('2014-03-19 10:00'))
      ).toQuery();

    console.log(command.text);

    client.query(command.text, command.values, function(err, result) {
      done(); //relase client back ot the connection pool
      if (err) { 
        return console.error('PG Error: Failed to store received tweet with error', err); 
      }

      json_objs = result.rows.map(function(r) {
        var channel = r.channel.substring(1);
        channel_counts[channel] = channel_counts[channel] + 1 || 1;
        var converted = convert_tweet(channel, r.json_value);
        return JSON.stringify(converted);
      });
      json_rows = json_rows.concat(json_objs);
      callback();
    });
  });
}

select_filtered_games(function() {
  pg.end();
  console.log(json_rows.length);
  console.log(channel_counts);

  var file_data = "[" + json_rows.join(",") + "]";

  fs.writeFile('json_data_extract.json', file_data, function(err) {
    if (err) throw err;
    console.log('File saved');
  });
});

//var counter = channels.length;

//channels.forEach(function(ch) {
//  select_filtered_games(ch, function() {
//    counter -= 1;
//    console.log("channel results: " + ch);
//    //console.log(counter);
//    console.log(json_rows.length);
//
//    if (counter == 0) {
//      pg.end();
//
//      var file_data = "[" + json_rows.join(",") + "]";
//
//      fs.writeFile('json_data_extract.json', file_data, function(err) {
//        if (err) throw err;
//        console.log('File saved');
//      });
//    }
//  });
//});

/*
  //loading it from the nurph console:
  
  f = File.open("../filtrand/json_data_extract.json")
  data = f.read

  //or
  uri = URI("http://www.example.net/json_data_extract.json")
  data = Net::HTTP.get(uri)

  json_data = JSON.parse(data)
  receiver = Receiver.new
  json_data.each { |j| receiver.receive(j) }

  //make sure to update flying sphinx after
  heroku run flying-sphinx index -a nurph
 */
