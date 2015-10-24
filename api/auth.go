package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/vincentcr/myfeeds/api/services"
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
	AuthMethodNone  AuthMethod = ""
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

	method, creds, err := parseAuthorizationFromRequest(r)

	if method == AuthMethodNone {
		return services.User{}, services.ErrNotFound
	}

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

type credentialParser func(r *http.Request) (AuthMethod, AuthCreds, error)

var credentialParsers = []credentialParser{parseAuthorizationFromHeader, parseAuthorizationFromForm}

func parseAuthorizationFromRequest(r *http.Request) (AuthMethod, AuthCreds, error) {

	for _, parser := range credentialParsers {
		method, creds, err := parser(r)
		if method != AuthMethodNone || err != nil {
			return method, creds, err
		}
	}
	return AuthMethodNone, nil, nil
}

func parseAuthorizationFromHeader(r *http.Request) (AuthMethod, AuthCreds, error) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return AuthMethodNone, nil, nil
	}

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

func parseAuthorizationFromForm(r *http.Request) (AuthMethod, AuthCreds, error) {
	token := r.FormValue("_auth_token")
	if token != "" {
		return AuthMethodToken, []string{token}, nil
	}
	return AuthMethodNone, nil, nil
}
