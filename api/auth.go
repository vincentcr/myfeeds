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

func (c *MyFeedsContext) GetUser() (services.User, bool) {
	val, ok := c.Env["user"]
	var user services.User
	if ok {
		user = val.(services.User)
	}

	return user, ok
}

func (c *MyFeedsContext) MustGetUser() services.User {
	user, ok := c.GetUser()
	if !ok {
		panic("no user but must get user")
	}
	return user
}

func (c *MyFeedsContext) GetUserAccess() services.Access {
	access, ok := c.Env["userAccess"]
	if !ok {
		panic("no access present in context env")
	}
	return access.(services.Access)
}

func mustAuthenticateRW(h handler) handler {
	return mustAuthenticate(services.AccessReadWrite, h)
}

func mustAuthenticate(access services.Access, h handler) handler {
	return func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		_, ok := c.GetUser()
		if !ok {
			w.Header().Set("WWW-Authenticate", "Basic realm=\"my rss feeds\"")
			panic(NewHttpError(http.StatusUnauthorized))
		} else if (access & c.GetUserAccess()) == 0 {
			panic(NewHttpError(http.StatusForbidden))
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
	method, creds, err := parseAuthorizationFromRequest(r)
	if err != nil {
		panic(err)
	} else if method != AuthMethodNone {
		user, access, err := verifyCredentials(c, method, creds)
		if err == services.ErrNotFound {
			panic(NewHttpErrorWithText(http.StatusUnauthorized, "Invalid Credentials"))
		} else if err != nil {
			panic(err)
		} else {
			log.Printf("authenticated as %v", user)
			c.Env["user"] = user
			c.Env["userAccess"] = access
		}
	}

	next()
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

func verifyCredentials(c *MyFeedsContext, method AuthMethod, creds AuthCreds) (services.User, services.Access, error) {
	switch method {
	case AuthMethodBasic:
		username := creds[0]
		password := creds[1]
		user, err := c.Services.Users.AuthenticateWithPassword(username, password)
		return user, services.AccessReadWrite, err
	case AuthMethodToken:
		token := creds[0]
		return c.Services.Users.AuthenticateWithToken(token)
	default:
		return services.User{}, services.AccessNone, NewHttpErrorWithText(http.StatusBadRequest, fmt.Sprintf("Unknown auth method %s", method))
	}

}

func parseAuthorizationFromHeader(r *http.Request) (AuthMethod, AuthCreds, error) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return AuthMethodNone, nil, nil
	}

	match := regexp.MustCompile("^(.+?)\\s+(.+)$").FindStringSubmatch(header)
	if len(match) == 0 {
		return "", nil, NewHttpErrorWithText(http.StatusBadRequest, "Invalid auth header")
	}

	method := AuthMethod(match[1])
	encodedCreds := match[2]
	var creds AuthCreds

	if method == AuthMethodBasic {
		userPasswordStr, err := base64.StdEncoding.DecodeString(encodedCreds)
		if err != nil {
			return "", nil, NewHttpErrorWithText(http.StatusBadRequest, "Invalid basic auth header: not base64")
		}

		creds = strings.Split(string(userPasswordStr), ":")

	} else if method == AuthMethodToken {
		tokenSecretMatch := regexp.MustCompile("token=\"(.+?)\".*").FindStringSubmatch(encodedCreds)
		if len(tokenSecretMatch) == 0 {
			return "", nil, NewHttpErrorWithText(http.StatusBadRequest, "Invalid auth token header")
		}

		creds = tokenSecretMatch[1:2]
	}

	return method, creds, nil
}

func parseAuthorizationFromForm(r *http.Request) (AuthMethod, AuthCreds, error) {
	token := r.FormValue("_tok")
	if token != "" {
		return AuthMethodToken, []string{token}, nil
	}
	return AuthMethodNone, nil, nil
}
