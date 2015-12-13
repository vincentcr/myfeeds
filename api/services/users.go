package services

import (
	"database/sql"
	"fmt"
	"strings"

	"gopkg.in/redis.v3"

	"github.com/lib/pq"

	"golang.org/x/crypto/bcrypt"
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

const bcryptCost = 8

func newUsers(config Config, db *sql.DB, redisClient *redis.Client) (*Users, error) {
	tokensStartDeleteExpiredLoop(db, tokenDeleteExpiredInterval)
	return &Users{config, db, redisClient}, nil
}

func (users *Users) Create(email string, password string) (User, error) {
	hashedPassword, err := hashPassword(password)
	if err != nil {
		return User{}, err
	}

	user := User{
		ID:       newID(),
		Email:    normalizeEmail(email),
		password: hashedPassword,
	}

	_, err = users.db.Exec("INSERT INTO users(id,email,password) VALUES($1,$2,$3)", user.ID, user.Email, user.password)
	if err != nil {
		if isUniqueError(err) {
			return User{}, ErrUniqueViolation
		} else {
			return User{}, fmt.Errorf("unable to create user %#v: %v", user, err)
		}
	}

	return user, nil
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("unable to hash password of length %v with cost %v: %v", len(password), bcryptCost, err)
	}
	return string(hash), nil
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func isUniqueError(err error) bool {
	if err, ok := err.(*pq.Error); ok {
		return err.Code.Name() == "unique_violation"
	}
	return false
}

func (users *Users) SameUser(userID1, userID2 string) bool {
	return normalizeID(userID1) == normalizeID(userID2)
}

func normalizeID(id string) string {
	return strings.ToLower(strings.Replace(id, "-", "", -1))
}

func (users *Users) GetByID(id RecordID) (User, error) {
	user := User{ID: id}
	err := users.db.
		QueryRow("SELECT email,password FROM users WHERE id=$1", id).
		Scan(&user.Email, &user.password)
	if err == sql.ErrNoRows {
		return User{}, ErrNotFound
	} else if err != nil {
		return User{}, fmt.Errorf("Error fetching user %v: %v", id, err)
	} else {
		return user, ErrNotFound
	}
}

func (users *Users) AuthenticateWithPassword(email string, password string) (User, error) {
	user := User{Email: normalizeEmail(email)}
	err := users.db.
		QueryRow("SELECT id,password FROM users WHERE email=$1", user.Email).
		Scan(&user.ID, &user.password)
	if err == sql.ErrNoRows {
		return User{}, ErrNotFound
	} else if err != nil {
		return User{}, fmt.Errorf("Error fetching user %v: %v", email, err)
	} else if verifyPassword(password, user) {
		return user, nil
	} else {
		return User{}, ErrNotFound
	}
}

func (users *Users) dbAuthenticateByToken(secret string) (User, Token, error) {
	user := User{}
	token := Token{Secret: secret}

	query := `select users.id, users.email, access_tokens.access, access_tokens.expires
		FROM access_tokens INNER JOIN users ON users.id = access_tokens.user_id
		WHERE access_token_is_valid($1, access_tokens.*)`
	err := users.db.
		QueryRow(query, secret).
		Scan(&user.ID, &user.Email, &token.Access, &token.Expires)
	if err == sql.ErrNoRows {
		return User{}, Token{}, ErrNotFound
	} else if err != nil {
		return User{}, Token{}, fmt.Errorf("Error fetching user from token %v: %v", token, err)
	} else {
		token.UserID = user.ID
		return user, token, nil
	}

}

func verifyPassword(password string, user User) bool {
	return bcrypt.CompareHashAndPassword([]byte(user.password), []byte(password)) == nil
}
