package services

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 8

func (users *Users) dbCreate(email string, password string) (User, error) {
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

func (users *Users) dbGetByID(id RecordID) (User, error) {
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

func (users *Users) dbAuthenticate(email string, password string) (User, error) {
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

func verifyPassword(password string, user User) bool {
	return bcrypt.CompareHashAndPassword([]byte(user.password), []byte(password)) == nil
}
