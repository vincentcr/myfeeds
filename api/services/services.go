package services

import (
	"database/sql"
	"database/sql/driver"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
	"github.com/satori/go.uuid"
	"gopkg.in/redis.v3"
)

type Services struct {
	Users *Users
	Feeds *Feeds
}

var (
	ErrUniqueViolation = fmt.Errorf("unique_violation")
	ErrNotFound        = fmt.Errorf("not_found")
)

func New() (*Services, error) {
	config, err := loadConfig()
	if err != nil {
		return nil, err
	}

	db, err := setupDB(config)
	if err != nil {
		return nil, err
	}
	redisClient, err := setupRedis(config)
	if err != nil {
		return nil, err
	}

	users, err := newUsers(config, db, redisClient)
	if err != nil {
		return nil, err
	}

	feeds, err := newFeeds(config, db, redisClient)
	if err != nil {
		return nil, err
	}

	svc := &Services{Users: users, Feeds: feeds}

	return svc, nil
}

func setupDB(config Config) (*sql.DB, error) {
	url := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=disable",
		config.Postgres.User, config.Postgres.Password, config.Postgres.Addr, config.Postgres.Database)
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, fmt.Errorf("unable to create db driver with params %v: %v", url, err)
	}

	_, err = db.Query("SELECT 1")
	if err != nil {
		return nil, fmt.Errorf("unable to connect to db with params %v: %v", url, err)
	}
	return db, nil
}

func setupRedis(config Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     config.RedisAddr,
		Password: "",
		DB:       0,
	})

	_, err := client.Ping().Result()
	if err != nil {
		return nil, fmt.Errorf("unable to ping redis server at %v: %v", config.RedisAddr, err)
	}
	return client, nil
}

type RecordID string

func (id RecordID) String() string {
	return string(id)
}

func (id RecordID) Value() (driver.Value, error) {
	return string(id), nil
}

func (id *RecordID) Scan(val interface{}) error {
	bytes, ok := val.([]byte)
	if !ok {
		return fmt.Errorf("Cast error: expected RecordID bytes, got %v", val)
	}
	str := string(bytes)
	*id = RecordID(strings.Replace(str, "-", "", -1))
	return nil
}

func newID() RecordID {
	u4 := uuid.NewV4()

	u4str := strings.ToLower(strings.Replace(u4.String(), "-", "", -1))
	return RecordID(u4str)
}

func dumpQueryResults(rows *sql.Rows) {
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("insert result: columns: %v", cols)

	for idx := 0; rows.Next(); idx++ {
		row := make([]interface{}, len(cols))
		if err := rows.Scan(row...); err != nil {
			log.Fatal(err)
		}
		log.Printf("row %d: %v\n", idx, row)
	}

}
