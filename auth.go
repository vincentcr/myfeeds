package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/vincentcr/myfeeds/services"
)

func mustAuthenticate(h handler) handler {
	return func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		_, ok := c.GetUser()
		if !ok {
			w.Header().Set("WWW-Authenticate", "Basic realm=\"my rss feeds\"")
			panic(NewHttpError(http.StatusUnauthorized))
		}
		h(c, w, r)
	}
}

type AuthMethod string
type AuthCreds []string

var (
	AuthMethodBasic AuthMethod = "Basic"
	AuthMethodToken AuthMethod = "Token"
)

func authenticate(c *MyFeedsContext, w http.ResponseWriter, r *http.Request, next NextFunc) {

	verify := func(method AuthMethod, creds AuthCreds) (services.User, error) {
		switch method {
		case AuthMethodBasic:
			username := creds[0]
			password := creds[1]
			return c.Services.Users.AuthenticateWithPassword(username, password)
		case AuthMethodToken:
			token := creds[0]
			return c.Services.Users.AuthenticateWithToken(token)
		default:
			return services.User{}, fmt.Errorf("Unknown auth method %v", method)
		}
	}

	user, err := authenticateRequest(verify, w, r)
	if err == nil {
		c.Env["user"] = user
		log.Printf("authenticated as %v", user)
	} else if err != services.ErrNotFound {
		panic(err)
	}

	next()
}

type authVerification func(method AuthMethod, creds AuthCreds) (services.User, error)

func authenticateRequest(verify authVerification, w http.ResponseWriter, r *http.Request) (services.User, error) {
	authHeader := r.Header.Get("Authorization")

	if authHeader != "" {
		method, creds, err := parseAuthorizationHeader(authHeader)
		if err != nil {
			return services.User{}, NewHttpErrorWithText(http.StatusBadRequest, err.Error())
		}
		user, err := verify(method, creds)
		if err == services.ErrNotFound {
			return services.User{}, NewHttpErrorWithText(http.StatusUnauthorized, "Invalid Credentials")
		} else if err != nil {
			return services.User{}, err
		} else {
			return user, nil
		}
	}

	return services.User{}, services.ErrNotFound
}

func parseAuthorizationHeader(header string) (AuthMethod, AuthCreds, error) {
	log.Printf("auth with header: '%s'", header)
	match := regexp.MustCompile("^(.+?)\\s+(.+)$").FindStringSubmatch(header)
	if len(match) == 0 {
		return "", nil, fmt.Errorf("Invalid auth header")
	}

	method := AuthMethod(match[1])
	encodedCreds := match[2]
	var creds AuthCreds

	if method == AuthMethodBasic {
		userPasswordStr, err := base64.StdEncoding.DecodeString(encodedCreds)
		if err != nil {
			return "", nil, fmt.Errorf("Invalid basic auth header: not base64")
		}

		creds = strings.Split(string(userPasswordStr), ":")

	} else if method == AuthMethodToken {
		tokenSecretMatch := regexp.MustCompile("token=\"(.+?)\".*").FindStringSubmatch(encodedCreds)
		if len(tokenSecretMatch) == 0 {
			return "", nil, fmt.Errorf("Invalid auth token header")
		}

		creds = tokenSecretMatch[1:2]
	}

	return method, creds, nil
}
