CREATE TABLE IF NOT EXISTS migrations (
    id integer PRIMARY KEY NOT NULL,
    created_at timestamp NOT NULL,
    description varchar(250) NOT NULL
);

/* Update the migrations table with this migration */
INSERT INTO migrations VALUES (1, current_timestamp, 'Created the migrations table.');
