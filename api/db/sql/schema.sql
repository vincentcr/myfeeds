
--CREATE DOMAIN uid NOT NULL CHECK(VALUE ~ '^[a-fA-F0-9]{32}$');

CREATE TABLE users(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE CHECK(email ~ '^[a-zA-Z0-9_%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9][a-zA-Z0-9]+$'),
  password VARCHAR(128) NOT NULL
);

CREATE UNIQUE INDEX idx_users_email ON users(lower(email));

CREATE TABLE feeds(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES users(id) NOT NULL,
  date_created TIMESTAMP NOT NULL DEFAULT timeofday()::TIMESTAMP,
  link TEXT NOT NULL CHECK (link != ''),
  title TEXT NOT NULL CHECK (link != ''),
  description TEXT
);
CREATE INDEX idx_feeds_owner_id ON feeds(owner_id);
CREATE INDEX idx_feeds_id_owner_id ON feeds(id, owner_id);
CREATE UNIQUE INDEX idx_feeds_owner_id_name ON feeds(owner_id, lower(title));
CREATE UNIQUE INDEX idx_feeds_owner_id_link ON feeds(owner_id, lower(link));


CREATE TABLE feed_items(
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id uuid REFERENCES feeds(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES users(id) NOT NULL,
  date_added TIMESTAMP NOT NULL DEFAULT timeofday()::TIMESTAMP,
  date_modified TIMESTAMP NOT NULL DEFAULT timeofday()::TIMESTAMP,
  link TEXT NOT NULL CHECK (link != ''),
  title TEXT NOT NULL CHECK (link != ''),
  description TEXT
);
CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_id_owner_id ON feed_items(id, owner_id);
CREATE UNIQUE INDEX idx_feeds_id_url ON feed_items(id, link);
