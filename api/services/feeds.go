package services

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/OneOfOne/xxhash"
	"github.com/satori/go.uuid"

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

type FeedData struct {
	Bytes []byte
	ETag  string
}

type feedCacheHint struct {
	user User
	id   RecordID
}

type formatQueryResults func(results []byte) []byte

type query struct {
	cacheHint feedCacheHint
	format    formatQueryResults
	sql       string
}

func (fs *Feeds) GetJson(user User, id RecordID) (FeedData, error) {
	return fs.findOne(query{cacheHint: feedCacheHint{user, id}, sql: "SELECT json FROM feed_json WHERE id=$1 and owner_id=$2"}, id, user.ID)
}

func (fs *Feeds) GetRss(user User, id RecordID) (FeedData, error) {
	return fs.findOne(query{cacheHint: feedCacheHint{user, id}, sql: "SELECT feed_xml($1,$2)"}, id, user.ID)
}

func (fs *Feeds) GetAllJson(user User) (FeedData, error) {
	format := func(results []byte) []byte {
		if results == nil {
			return []byte("[]")
		} else {
			return results
		}
	}
	return fs.findMany(query{cacheHint: feedCacheHint{user: user}, format: format, sql: "SELECT json FROM feeds_json WHERE owner_id=$1"}, user.ID)
}

func (fs *Feeds) findOne(query query, args ...interface{}) (FeedData, error) {
	res, err := fs.findMany(query, args...)
	if res.Bytes == nil && err == nil {
		return FeedData{}, ErrNotFound
	} else {
		return res, err
	}
}

func (fs *Feeds) findMany(query query, args ...interface{}) (FeedData, error) {
	cacheKey := makeCacheKey(query.sql, args)
	bytes, etag, err := fs.getFromCache(cacheKey)
	if err != nil {
		return FeedData{}, err
	} else if bytes != nil {
		return FeedData{bytes, etag}, nil
	}
	bytes, err = fs.getFromDB(query, args)
	if err != nil {
		return FeedData{}, err
	}

	etag = makeEtag()

	if err := fs.addToCache(cacheKey, bytes, etag, 2*time.Hour, query.cacheHint); err != nil {
		return FeedData{}, err
	}

	return FeedData{bytes, etag}, err
}

func makeEtag() string {
	return uuid.NewV4().String()
}

func makeCacheKey(query string, args []interface{}) string {
	h := xxhash.NewS64(0XBABE)
	h.Write([]byte(query))
	for _, arg := range args {
		h.Write([]byte{0})
		h.Write([]byte(fmt.Sprintf("%v", arg)))
	}
	return fmt.Sprintf("query.%v", h.Sum64())
}

func (fs *Feeds) getFromCache(cacheKey string) ([]byte, string, error) {
	hash, err := fs.redis.HMGet(cacheKey, "data", "etag").Result()
	if err == redis.Nil || hash[0] == nil {
		return nil, "", nil
	} else if err != nil {
		return nil, "", fmt.Errorf("error fetching feed from cache with key %v: %v", cacheKey, err)
	} else {
		data := hash[0].(string)
		etag := hash[1].(string)
		return []byte(data), etag, nil
	}
}

func (fs *Feeds) addToCache(cacheKey string, data []byte, etag string, expiration time.Duration, cacheHint feedCacheHint) error {
	_, err := fs.redis.Pipelined(func(pipe *redis.Pipeline) error {
		pipe.HMSet(cacheKey, "data", string(data), "etag", etag)
		pipe.Expire(cacheKey, expiration)
		rkey := reverseMapCacheKey(cacheHint)
		pipe.SAdd(rkey, cacheKey)
		return nil
	})
	return err
}

func reverseMapCacheKey(cacheHint feedCacheHint) string {
	return "feed_rkeys." + string(cacheHint.user.ID) + "." + string(cacheHint.id)
}

func (fs *Feeds) getFromDB(query query, args []interface{}) ([]byte, error) {
	var rawResults []byte
	err := fs.db.QueryRow(query.sql, args...).Scan(&rawResults)
	if err == nil || err == sql.ErrNoRows {
		if query.format != nil {
			return query.format(rawResults), nil
		} else {
			return rawResults, nil
		}
	} else {
		return nil, fmt.Errorf("Error fetching from db with query %v, args %v: %v", query, args, err)
	}
}

func (fs *Feeds) invalidateFeedCache(cacheHint feedCacheHint) error {
	rkeys := []string{reverseMapCacheKey(cacheHint), reverseMapCacheKey(feedCacheHint{user: cacheHint.user})}
	script := `
		local num_deleted = 0;
		for i=1, #KEYS do
	    local keys = redis.call('smembers', KEYS[i]);
	    if table.getn(keys) > 0 then
	      num_deleted = num_deleted + redis.call('del', unpack(keys));
	      redis.call('del', KEYS[i]);
	    else
	    end
		end
	  return num_deleted;
	`
	ret, err := fs.redis.Eval(script, rkeys, nil).Result()
	if err != nil {
		return fmt.Errorf("failed to delete cached keys in %v: %v", rkeys, err)
	} else {
		log.Printf("invalidated %v cache entries for %v", ret, cacheHint)
	}
	return nil
}

func (fs *Feeds) Create(user User, token string, feed *Feed) error {
	if feed.ID == "" {
		feed.ID = newID()
	}

	if feed.Items == nil {
		feed.Items = []FeedItem{}
	}

	feed.Link = makeFeedURL(fs.config, feed, token)
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

	fs.invalidateFeedCache(feedCacheHint{user, feed.ID})

	return tx.Commit()
}

func makeFeedURL(config Config, feed *Feed, token string) string {
	longUrl := config.PublicURL + "/feeds/" + string(feed.ID) + "/rss?_tok=" + token
	shortUrl, err := shortenUrl(config, longUrl)
	if err != nil { // fallback to long url
		log.Println(err)
		return longUrl
	} else {
		return shortUrl
	}

}

func (fs *Feeds) Delete(user User, feedID RecordID) error {
	res, err := fs.db.Exec("DELETE FROM feeds WHERE id=$1 AND owner_id=$2", feedID, user.ID)
	if err != nil {
		return err
	}
	fs.invalidateFeedCache(feedCacheHint{user, feedID})
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
	fs.invalidateFeedCache(feedCacheHint{user, feed.ID})

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
	fs.invalidateFeedCache(feedCacheHint{user, item.FeedID})

	return tx.Commit()
}

func (fs *Feeds) UpdateItem(user User, item FeedItem) error {
	res, err := fs.db.Exec("UPDATE feed_items set link=$1,title=$2,description=$3,date_modified=NOW() WHERE id=$4 AND owner_id=$5",
		item.Link, item.Title, item.Description, item.ID, user.ID)
	if err != nil {
		return err
	}
	fs.invalidateFeedCache(feedCacheHint{user, item.FeedID})

	return checkRowsAffected(res, 1)
}

func (fs *Feeds) DeleteItem(user User, feedID RecordID, itemID RecordID) error {
	res, err := fs.db.Exec("DELETE FROM feed_items WHERE id=$1 AND owner_id=$2", itemID, user.ID)
	if err != nil {
		return err
	}
	fs.invalidateFeedCache(feedCacheHint{user, feedID})
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

func shortenUrl(config Config, longUrl string) (string, error) {

	url := fmt.Sprintf("https://api-ssl.bitly.com/v3/user/link_save?access_token=%s&longUrl=%s", config.BitlyAPIKey, url.QueryEscape(longUrl))
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("shortenUrl: failed to exec request %v: %v", url, err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("shortenUrl: failed to read request response to %v: %v", url, err)
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("shortenUrl: request %v returned %v status, body %s", url, resp.StatusCode, string(body))
	}

	var shortenerRes struct {
		Data struct{ Link_Save struct{ Link string } }
	}
	err = json.Unmarshal(body, &shortenerRes)
	if err != nil {
		return "", fmt.Errorf("shortenUrl: request %v returned unparsable body %v: %v", url, string(body), err)
	}

	shortUrl := shortenerRes.Data.Link_Save.Link
	if shortUrl == "" {
		return "", fmt.Errorf("shortenUrl: request %v returned unexpected body %v: parsed: %#v", url, string(body), shortenerRes)
	}

	return shortUrl, nil
}

func trace(label string) (string, time.Time) {
	log.Printf("START:%s...", label)
	return label, time.Now()
}

func un(label string, startTime time.Time) {
	endTime := time.Now()
	elapsed := endTime.Sub(startTime)
	log.Printf("  END:%s => %.4fms", label, elapsed.Seconds()*1000)
}
