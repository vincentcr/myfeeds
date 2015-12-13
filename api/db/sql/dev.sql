
INSERT INTO users(id, email,password) VALUES
  ('86eb1856a155497aac7fd7ef50e7d2df', 'vincentcr@gmail.com', crypt('abcdefg', gen_salt('bf', 8)))
;

INSERT INTO access_tokens(secret, user_id, access) VALUES
  ('soverysecret', (SELECT id FROM users WHERE email = 'vincentcr@gmail.com'), 3)
;

INSERT INTO feeds(id, owner_id, link, title) VALUES
  ('2307ebf7548c4cb7918f680787bf4760', '86eb1856a155497aac7fd7ef50e7d2df', 'http://localhost/foo1', 'test-feed google')
;

INSERT INTO feed_items(feed_id, owner_id, link, title) VALUES
  ('2307ebf7548c4cb7918f680787bf4760', '86eb1856a155497aac7fd7ef50e7d2df', 'http://google.com/foo1', 'google foo1'),
  ('2307ebf7548c4cb7918f680787bf4760', '86eb1856a155497aac7fd7ef50e7d2df', 'http://google.com/foo2', 'google foo2'),
  ('2307ebf7548c4cb7918f680787bf4760', '86eb1856a155497aac7fd7ef50e7d2df', 'http://google.com/foo3', 'google foo3'),
  ('2307ebf7548c4cb7918f680787bf4760', '86eb1856a155497aac7fd7ef50e7d2df', 'http://google.com/foo4', 'google foo4')
;


INSERT INTO feeds(id, owner_id, link, title) VALUES
  ('35ede754530e45dfbd53fade4698ead8', '86eb1856a155497aac7fd7ef50e7d2df', 'http://localhost/foo2', 'test-feed yahoo')
;

INSERT INTO feed_items(feed_id, owner_id, link, title) VALUES
  ('35ede754530e45dfbd53fade4698ead8', '86eb1856a155497aac7fd7ef50e7d2df', 'http://yahoo.com/foo1', 'yahoo foo1'),
  ('35ede754530e45dfbd53fade4698ead8', '86eb1856a155497aac7fd7ef50e7d2df', 'http://yahoo.com/foo2', 'yahoo foo2'),
  ('35ede754530e45dfbd53fade4698ead8', '86eb1856a155497aac7fd7ef50e7d2df', 'http://yahoo.com/foo3', 'yahoo foo3'),
  ('35ede754530e45dfbd53fade4698ead8', '86eb1856a155497aac7fd7ef50e7d2df', 'http://yahoo.com/foo4', 'yahoo foo4')
;

VACUUM ANALYZE;
