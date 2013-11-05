/* run these individually on DB postgress */ 
CREATE USER filtrand_user WITH PASSWORD 'filtrand_user';
CREATE DATABASE filtrand WITH OWNER filtrand_user ENCODING 'UTF8';

/*  you shouldn't need the following, but if you do switch to the db 
    filtrand and run: */
/* GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO filtrand_user; */


