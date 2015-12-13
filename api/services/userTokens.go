package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"gopkg.in/redis.v3"
)

const tokenKeyFormat = "token.%s"
const tokenListKeyFormat = "tokenlist.%s"
const tokenSecretSize = 32
const tokenDeleteExpiredInterval = 1 * time.Hour
const maxDuration time.Duration = 1<<63 - 1

type Access int

const (
	AccessRead      Access = 1 << iota
	AccessWrite            = 1 << iota
	AccessReadWrite        = AccessRead | AccessWrite
	AccessNone             = 0
)

type Token struct {
	Secret  string
	UserID  RecordID
	Access  Access
	Expires *time.Time
}

type tokenOptions struct {
	duration   time.Duration
	access     Access
	secretSize int
}

func (users *Users) CreateTokenRW(user User) (Token, error) {
	return users.CreateToken(user, AccessReadWrite)
}

func (users *Users) CreateToken(user User, access Access) (Token, error) {
	duration := maxDuration

	token, err := tokenDbCreate(users.db, user, access, duration)
	if err != nil {
		return token, err
	}

	err = tokenAddToCache(users.redis, user, token)

	return token, nil
}

func tokenDbCreate(db *sql.DB, user User, access Access, duration time.Duration) (Token, error) {
	secret, err := tokenGenerateSecret(user.ID, tokenSecretSize)
	if err != nil {
		return Token{}, err
	}

	token := Token{
		Secret:  secret,
		UserID:  user.ID,
		Access:  access,
		Expires: mkExpires(duration),
	}

	_, err = db.Exec("INSERT INTO access_tokens(secret, user_id, access, expires) VALUES($1,$2,$3,$4)",
		token.Secret, token.UserID, token.Access, token.Expires)
	if err != nil {
		return Token{}, fmt.Errorf("Failed to insert token %v into db: %v", token, err)
	}
	return token, nil
}

func mkExpires(duration time.Duration) *time.Time {
	if duration == maxDuration {
		return nil
	} else {
		expires := time.Now().Add(duration)
		return &expires
	}
}

func tokenGenerateSecret(userID RecordID, size int) (string, error) {
	secretOffset := len(userID) + 1
	buf := make([]byte, secretOffset+size)
	copy(buf, userID+":")
	nRandBytes, err := rand.Read(buf[secretOffset:])
	if err != nil {
		return "", fmt.Errorf("unable to generate %v bytes of randomness: %v", size, err)
	} else if nRandBytes < size {
		return "", fmt.Errorf("got %d bytes from rand instead of requested %v", nRandBytes, size)
	}

	encoded := base64.URLEncoding.EncodeToString(buf)

	//URLEncode still might contain the '=', which is not very URL-friendly.
	encodedForURL := strings.Replace(encoded, "=", "", -1)

	return encodedForURL, nil
}

func tokenAddToCache(redisClient *redis.Client, user User, token Token) error {
	userJson, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("unable to json-encode user %v: %v", user, err)
	}

	key := fmt.Sprintf(tokenKeyFormat, token.Secret)
	accessStr := strconv.Itoa(int(token.Access))
	err = redisClient.HMSet(key, "user", string(userJson), "access", accessStr).Err()
	if err != nil {
		return fmt.Errorf("redis.HMSet(%v, 'user', %s, 'access', %v) failed: %v", key, userJson, accessStr, err)
	}
	if token.Expires != nil {
		err = redisClient.ExpireAt(key, *token.Expires).Err()
		if err != nil {
			return fmt.Errorf("redis.ExpireAt(%v, %v) failed: %v", key, token.Expires, err)
		}

	}

	tokenListKey := fmt.Sprintf(tokenListKeyFormat, user.ID)
	err = redisClient.SAdd(tokenListKey, key).Err()
	if err != nil {
		return fmt.Errorf("redis.Sadd(%v, %s) failed: %v", tokenListKey, key)
	}
	return nil
}

func (users *Users) AuthenticateWithToken(secret string) (User, Access, error) {
	user, access, err := tokenGetFromCache(users.redis, secret)
	if err != ErrNotFound {
		return user, access, err
	}

	user, token, err := users.dbAuthenticateByToken(secret)
	if err == nil {
		tokenAddToCache(users.redis, user, token)
	}

	return user, token.Access, err
}

func tokenGetFromCache(redisClient *redis.Client, token string) (User, Access, error) {
	key := fmt.Sprintf(tokenKeyFormat, token)
	data, err := redisClient.HMGet(key, "user", "access").Result()
	if err == redis.Nil || data[0] == nil {
		return User{}, AccessNone, ErrNotFound
	} else if err != nil {
		return User{}, AccessNone, fmt.Errorf("unable to get key %v: %v", token, err)
	}

	user := User{}
	err = json.Unmarshal([]byte(data[0].(string)), &user)
	if err != nil {
		return User{}, AccessNone, fmt.Errorf("unable to unmarshall user from json %v: %v", data[0], err)
	}

	access, err := strconv.Atoi(data[1].(string))
	if err != nil {
		return User{}, AccessNone, fmt.Errorf("unable to convert access string %v to an int: %v", data[1], err)
	}

	return user, Access(access), nil
}

func (users *Users) DeleteToken(user User, token string) error {
	err := tokenDeleteFromCache(users.redis, user, token)
	if err != nil {
		return err
	}

	return tokenDeleteFromDB(users.db, user, token)
}

func tokenDeleteFromCache(redisClient *redis.Client, user User, token string) error {
	key := fmt.Sprintf(tokenKeyFormat, token)
	err := redisClient.Del(key).Err()
	if err != nil {
		return fmt.Errorf("unable to delete key %v: %v", key, err)
	}

	tokenListKey := fmt.Sprintf(tokenListKeyFormat, user.ID)
	err = redisClient.SRem(tokenListKey, key).Err()
	if err != nil {
		return fmt.Errorf("unable to remove entry %v from set %v: %v", key, tokenListKey, err)
	}

	return nil
}

func tokenDeleteFromDB(db *sql.DB, user User, secret string) error {
	_, err := db.Exec("DELETE FROM access_tokens WHERE secret = $1 AND user_id = $2", secret, user.ID)
	if err != nil {
		return fmt.Errorf("failed to delete token %v from db: %v", secret, err)
	}
	return nil
}

func (users *Users) DeleteAllTokens(userID RecordID) error {
	err := tokenDeleteAllFromCache(users.redis, userID)
	if err != nil {
		return err
	}

	return tokenDeleteAllFromDB(users.db, userID)
}

func tokenDeleteAllFromCache(redisClient *redis.Client, userID RecordID) error {
	tokenListKey := fmt.Sprintf(tokenListKeyFormat, userID)
	keys, err := redisClient.SMembers(tokenListKey).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("unable to get members of set %v: %v", tokenListKey, err)
	}

	err = redisClient.Del(keys...).Err()
	if err != nil {
		return fmt.Errorf("unable to delete keys %v: %v", keys, err)
	}

	return nil
}

func tokenDeleteAllFromDB(db *sql.DB, userID RecordID) error {
	_, err := db.Exec("DELETE FROM access_tokens WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete all tokens of user %v from db: %v", userID, err)
	}
	return nil
}

func tokensStartDeleteExpiredLoop(db *sql.DB, interval time.Duration) {
	go func() {
		tick := time.Tick(interval)
		for range tick {
			if err := tokensDeleteExpired(db); err != nil {
				log.Println(err)
			}
		}
	}()
}

func tokensDeleteExpired(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM access_tokens WHERE expires IS NOT NULL AND expires < NOW();")
	if err != nil {
		return fmt.Errorf("Failed to delete expired tokens: %v", err)
	}
	return nil
}
