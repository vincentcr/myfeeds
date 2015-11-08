package services

import (
	"bytes"
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
		QueryRow("SELECT json FROM feed_json WHERE id=$1 and owner_id=$2", id, user.ID).
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
	err := fs.db.QueryRow("SELECT json FROM feeds_json WHERE owner_id=$1", user.ID).
		Scan(&feedsJson)
	if err != nil {
		return nil, fmt.Errorf("Error fetching feeds for %v: %v", user.ID, err)
	}

	return feedsJson, nil
}

func (fs *Feeds) Create(user User, feed *Feed) error {
	if feed.ID == "" {
		feed.ID = newID()
	}
	feed.Link = fs.config.RootURL + "/feeds/" + string(feed.ID)
	feed.ownerID = user.ID

	tx, err := fs.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("INSERT INTO feeds(id,owner_id,title,link,description) VALUES($1,$2,$3,$4,$5)",
		feed.ID, feed.ownerID, feed.Title, feed.Link, feed.Description)
	if err != nil {
		if isUniqueError(err) {
			return ErrUniqueViolation
		} else {
			return fmt.Errorf("unable to create feed %#v: %v", feed, err)
		}
	}

	err = fs.addItems(user, feed.ID, feed.Items, tx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (fs *Feeds) Delete(user User, feedID RecordID) error {
	res, err := fs.db.Exec("DELETE FROM feeds WHERE id=$1 AND owner_id=$2", feedID, user.ID)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, 1)
}

func (fs *Feeds) Update(user User, feed *Feed) error {

	tx, err := fs.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec("UPDATE feeds set title=$1 WHERE id=$2 AND owner_id=$3", feed.Title, feed.ID, user.ID)
	if err != nil {
		return err
	}
	err = checkRowsAffected(res, 1)
	if err != nil {
		return err
	}

	if feed.Items != nil {
		err = fs.replaceItems(user, feed.ID, feed.Items, tx)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (fs *Feeds) replaceItems(user User, feedID RecordID, items []FeedItem, tx *sql.Tx) error {
	_, err := tx.Exec("DELETE FROM feed_items WHERE feed_id = $1 AND owner_id = $2", feedID, user.ID)
	if err != nil {
		return err
	}

	return fs.addItems(user, feedID, items, tx)
}

func (fs *Feeds) addItems(user User, feedID RecordID, items []FeedItem, tx *sql.Tx) error {
	if len(items) == 0 {
		return nil
	}

	// build query to insert multiple items.
	// we use the owner_id constraint to ensure that we can't add items to feeds
	// of another user: if the owner_id in feeds doesn't match, (SELECT owner_id FROM owned_feed)
	// will be null and inserts will be rejected
	query := bytes.Buffer{}
	query.WriteString(`
		WITH owned_feed AS (SELECT owner_id FROM feeds WHERE id = $1 AND owner_id = $2)
			INSERT INTO feed_items(id, feed_id, owner_id, link, title, description) VALUES
	`)
	params := []interface{}{feedID, user.ID}
	itemCount := len(items)
	for idx, item := range items {
		//set missing fields
		if item.ID == "" {
			item.ID = newID()
		}
		item.FeedID = feedID
		item.ownerID = user.ID
		items[idx] = item //put it back in array so caller sees updated values

		//add statement line and params
		nextParam := len(params) + 1
		fmt.Fprintf(&query, "($%d, $%d, (SELECT owner_id FROM owned_feed), $%d, $%d, $%d)",
			nextParam, nextParam+1, nextParam+2, nextParam+3, nextParam+4)
		params = append(params, item.ID, feedID, item.Link, item.Title, item.Description)
		if idx < itemCount-1 {
			query.WriteString(",")
		}
	}
	res, err := tx.Exec(query.String(), params...)
	if err != nil {
		return err
	}
	return checkRowsAffected(res, int64(itemCount))
}

func (fs *Feeds) AddItem(user User, item *FeedItem) error {
	tx, err := fs.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	items := []FeedItem{*item}
	err = fs.addItems(user, item.FeedID, items, tx)
	*item = items[0]

	return tx.Commit()
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
	res, err := fs.db.Exec("DELETE FROM feed_items WHERE id=$1 AND owner_id=$2", itemID, user.ID)
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
