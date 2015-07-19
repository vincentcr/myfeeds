package services

import (
	"encoding/base64"
	"fmt"
	"math/rand"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"gopkg.in/redis.v3"
)

var redisClient *redis.Client

func init() {
	var err error
	redisClient, err = setupRedis()
	if err != nil {
		panic(err.Error())
	}
}

func TestGenerateToken(t *testing.T) {
	count := 1024
	userID := randString(33, alphanum)
	size := 24
	tokens := map[Token]struct{}{}

	for i := 0; i < count; i++ {
		token, err := tokenGenerate(userID, size)
		assert.Nil(t, err)

		buf, err := base64.URLEncoding.DecodeString(base64Pad(token))
		assert.Nil(t, err)

		assert.Equal(t, len(buf), len(userID)+1+size, "size mismatched")

		assert.True(t, strings.HasPrefix(string(buf), userID), "token should start with user ID")

		_, exists := tokens[token]
		assert.False(t, exists, "duplicate token: "+token)

		tokens[token] = struct{}{}

	}
}

func base64Pad(token Token) string {
	padded := string(token)
	if m := len(padded) % 4; m != 0 {
		padded += strings.Repeat("=", 4-m)
	}
	return padded
}

func TestCreateAndGet(t *testing.T) {
	svc := setupTest(t)

	tokensPerUser := 8
	tokensByUser := map[string][]Token{}
	users := mockUsers(4)

	//create tokens
	for userID, user := range users {
		tokensByUser[userID] = make([]Token, tokensPerUser)
		for i := 0; i < tokensPerUser; i++ {

			token, err := svc.tokenCreate(user)
			assert.Nil(t, err)

			tokensByUser[userID][i] = token
		}
	}

	//get users from tokens
	for userID, userTokens := range tokensByUser {
		expected := users[userID]
		for _, token := range userTokens {
			actual, err := svc.tokenGetUser(token)
			assert.Nil(t, err)
			assert.EqualValues(t, expected, actual, "users should be same")
		}
	}
}

func TestExpire(t *testing.T) {
	svc := setupTest(t)
	user := mockUser()
	duration := time.Millisecond * 100
	token, err := svc.tokenCreateWithOptions(user, TokenOptions{Duration: duration})
	assert.Nil(t, err)
	actual, err := svc.tokenGetUser(token)
	assert.Nil(t, err)
	assert.EqualValues(t, user, actual, "users should be same")

	time.Sleep(duration / 2)

	actual, err = svc.tokenGetUser(token)
	assert.Nil(t, err)
	assert.EqualValues(t, user, actual, "users should be same")

	time.Sleep(duration/2 + 1)
	actual, err = svc.tokenGetUser(token)
	assert.Nil(t, err)
	assert.Nil(t, actual)
}

func TestDelete(t *testing.T) {
	svc := setupTest(t)
	user := mockUser()
	token, err := svc.tokenCreate(user)
	assert.Nil(t, err)
	actual, err := svc.tokenGetUser(token)
	assert.Nil(t, err)
	assert.EqualValues(t, user, actual, "users should be same")

	err = svc.tokenDelete(user.ID, token)
	assert.Nil(t, err)
	actual, err = svc.tokenGetUser(token)
	assert.Nil(t, err)
	assert.Nil(t, actual)
}

func TestDeleteAll(t *testing.T) {
	svc := setupTest(t)
	tokensPerUser := 8
	tokensByUser := map[string][]Token{}
	users := mockUsers(4)

	//create tokens
	for userID, user := range users {
		tokensByUser[userID] = make([]Token, tokensPerUser)
		for i := 0; i < tokensPerUser; i++ {

			token, err := svc.tokenCreate(user)
			assert.Nil(t, err)

			tokensByUser[userID][i] = token
		}
	}

	chosenUser := randomUser(users)
	err := svc.tokenDeleteAll(chosenUser.ID)
	assert.Nil(t, err)

	for _, user := range users {
		for _, token := range tokensByUser[user.ID] {
			actual, err := svc.tokenGetUser(token)
			assert.Nil(t, err)
			if user == chosenUser {
				assert.Nil(t, actual)
			} else {
				assert.EqualValues(t, user, actual, "user should be the same")
			}
		}
	}

}

///////// helpers ////////

func setupTest(t *testing.T) *Users {
	flushAll()

	Users, err := newUsers(nil, redisClient)
	assert.Nil(t, err)
	return Users
}

func flushAll() {
	if err := redisClient.FlushAll().Err(); err != nil {
		panic(fmt.Sprintf("unable to flushall: %v", err))
	}
}

func mockUsers(n int) map[string]*User {
	users := map[string]*User{}
	for i := 0; i < n; i++ {
		user := mockUser()
		users[user.ID] = user
	}
	return users
}

func randomUser(users map[string]*User) *User {
	randomIdx := rand.Intn(len(users))
	idx := 0
	for _, user := range users {
		if idx == randomIdx {
			return user
		}
		idx++
	}
	panic("should never reach here")
}

func mockUser() *User {
	return &User{
		ID:    randString(33, alphanum),
		Email: randWord(10) + "@" + randWord(8) + ".com",
	}
}

var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
var digits = []rune("0123456789")
var alphanum = append(append(make([]rune, 0), digits...), letters...)

func randWord(n int) string {
	return randString(n, letters)
}

func randString(n int, chars []rune) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(letters))]
	}
	return string(b)
}
