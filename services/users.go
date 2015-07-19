package services

import (
	"database/sql"
	"fmt"
	"strings"

	"gopkg.in/redis.v3"
)

type User struct {
	ID       RecordID `json:"id"`
	Email    string   `json:"email"`
	password string
}

func (user User) String() string {
	return fmt.Sprintf("User[%s, email:%s]", user.ID, user.Email)
}

type Users struct {
	config Config
	db     *sql.DB
	redis  *redis.Client
}

func newUsers(config Config, db *sql.DB, redisClient *redis.Client) (*Users, error) {
	return &Users{config, db, redisClient}, nil
}

func (users *Users) Create(email string, password string) (User, error) {
	return users.dbCreate(email, password)
}

func (users *Users) SameUser(userID1, userID2 string) bool {
	return normalizeID(userID1) == normalizeID(userID2)
}

func normalizeID(id string) string {
	return strings.ToLower(strings.Replace(id, "-", "", -1))
}

func (users *Users) GetByID(userID RecordID) (User, error) {
	return users.dbGetByID(userID)
}

func (users *Users) AuthenticateWithPassword(email string, password string) (User, error) {
	return users.dbAuthenticate(email, password)
}

func (users *Users) AuthenticateWithToken(token string) (User, error) {
	return users.tokenGetUser(Token(token))
}

func (users *Users) CreateToken(user User) (Token, error) {
	return users.tokenCreate(user)
}
