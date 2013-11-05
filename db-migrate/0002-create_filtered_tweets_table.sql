CREATE TABLE IF NOT EXISTS filtered_tweets (
    /*filtrand defined fields*/
    channel varchar(150),
    was_emitted boolean NOT NULL,
    rejected_reason varchar, /* the reason the tweet wasn't emitted */
    filtered_at timestamp NOT NULL,

    /* twitter defined fields */
    created_at timestamp,
    sender varchar(50), /* standard is limit 15, but there are historical accounts which are larger */
    tweet_id bigint,
    source varchar(200), /* twitter api limit s unknown */
    json_value json NOT NULL
);

/* Update the migrations table with this migration */
INSERT INTO migrations VALUES (2, current_timestamp, 'Create the filtered_tweets table.');

