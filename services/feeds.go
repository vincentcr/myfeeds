package services

import (
	"database/sql"
	"fmt"

	"gopkg.in/redis.v3"
)

type Feed struct {
	ID          RecordID   `json:"id"`
	Link        string     `json:"link"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Items       []FeedItem `json:"items"`
	ownerID     RecordID
}

type FeedItem struct {
	ID          RecordID `json:"id"`
	FeedID      RecordID `json:"feedID,omitifempty"`
	Link        string   `json:"link"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	ownerID     RecordID
}

type Feeds struct {
	config Config
	db     *sql.DB
	redis  *redis.Client
}

func newFeeds(config Config, db *sql.DB, redisClient *redis.Client) (*Feeds, error) {
	return &Feeds{config, db, redisClient}, nil
}

func (fs *Feeds) GetJson(user User, id RecordID) ([]byte, error) {
	var feedJson []byte
	err := fs.db.
		QueryRow("SELECT json FROM feeds_json WHERE id=$1 and owner_id=$2", id, user.ID).
		Scan(&feedJson)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("Error fetching feed %v: %v", id, err)
	} else {
		return feedJson, nil
	}
}

func (fs *Feeds) GetRss(user User, id RecordID) ([]byte, error) {
	var feedXml string
	err := fs.db.QueryRow("SELECT xml FROM feeds_xml WHERE id=$1 and owner_id=$2", id, user.ID).
		Scan(&feedXml)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("Error fetching feed %v: %v", id, err)
	} else {
		return []byte(feedXml), nil
	}
}

func (fs *Feeds) GetAllJson(user User) ([]byte, error) {
	var feedsJson []byte
	err := fs.db.QueryRow("SELECT json_agg(json) FROM feeds_json WHERE owner_id=$1", user.ID).
		Scan(&feedsJson)
	if err != nil {
		return nil, fmt.Errorf("Error fetching feeds for %v: %v", user.ID, err)
	}

	return feedsJson, nil
}

func (fs *Feeds) Create(user User, feed Feed) (Feed, error) {
	feed.ID = newID()
	feed.Link = fs.config.RootURL + "/feeds/" + string(feed.ID)
	feed.ownerID = user.ID

	_, err := fs.db.Exec("INSERT INTO feeds(id,owner_id,title,link,description) VALUES($1,$2,$3,$4,$5)",
		feed.ID, feed.ownerID, feed.Title, feed.Link, feed.Description)
	if err != nil {
		if isUniqueError(err) {
			return Feed{}, ErrUniqueViolation
		} else {
			return Feed{}, fmt.Errorf("unable to create feed %#v: %v", feed, err)
		}
	}

	return feed, nil
}

func (fs *Feeds) Delete(user User, feedID RecordID) error {
	res, err := fs.db.Exec("DELETE FROM feeds WHERE id=$1 AND owner_id=$2", feedID, user.ID)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, 1)
}

func (fs *Feeds) Update(user User, feed Feed) error {
	res, err := fs.db.Exec("UPDATE feeds set NAME=$1 WHERE id=$1 AND owner_id=$3", feed.Title, feed.ID, user.ID)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, 1)
}

func (fs *Feeds) AddItem(user User, item FeedItem) (RecordID, error) {
	item.ID = newID()
	item.ownerID = user.ID

	//the select ensures that the feed item owner is the same as the feed owner
	q := `
    INSERT INTO feed_items(id, feed_id, owner_id, link,title,description) VALUES(
      $1, $2, (SELECT owner_id FROM feeds WHERE id = $2 AND owner_id = $3), $4, $5)
  `
	res, err := fs.db.Exec(q, item.ID, item.FeedID, item.ownerID, item.Link, item.Title, item.Description)
	if err != nil {
		return "", err
	}
	return "", checkRowsAffected(res, 1)
	return item.ID, nil
}

func (fs *Feeds) UpdateItem(user User, item FeedItem) error {
	res, err := fs.db.Exec("UPDATE feed_items set link=$1,title=$2,description=$3 WHERE id=$4 AND owner_id=$5",
		item.Link, item.Title, item.Description, item.ID, user.ID)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, 1)
}

func (fs *Feeds) DeleteItem(user User, itemID RecordID) error {
	res, err := fs.db.Exec("DELETE FROM feed_items WHERE id=$1 AND owner_id=$5", itemID, user.ID)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, 1)
}

func checkRowsAffected(res sql.Result, expected int64) error {
	actual, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("Could not check rows affected: %v", err)
	}
	if actual != expected {
		return fmt.Errorf("Unexpected result: expected %v, got %v", expected, actual)
	}
	return nil
}
