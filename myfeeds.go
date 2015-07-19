package main

import (
	"encoding/json"
	"net/http"

	"gopkg.in/validator.v2"

	"github.com/vincentcr/myfeeds/services"
)

func main() {
	svc, err := services.New()
	if err != nil {
		panic(err.Error())
	}

	setupServer(svc)
}

func setupServer(svc *services.Services) {
	m := NewMux(svc)
	// goji.Use(MyMiddleware)
	setupMiddlewares(m)
	routeUsers(m)
	routeFeeds(m)
	m.Serve()
}

func setupMiddlewares(m *Mux) {
	m.Use(httpErrorRecovery)
	m.Use(authenticate)
}

type UserRequest struct {
	Email    string `validate:"nonzero,regexp=^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[[:alnum:]]{2,}$"`
	Password string `validate:"nonzero,min=6"`
}

func routeUsers(m *Mux) {

	m.Post("/users", func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		var userReq UserRequest
		if err := parseAndValidate(r, &userReq); err != nil {
			panic(err)
		}

		user, err := c.Services.Users.Create(userReq.Email, userReq.Password)
		if err == services.ErrUniqueViolation {
			panic(HttpError{StatusCode: 400, StatusText: "User already exists"})
		} else if err != nil {
			panic(err)
		}

		jsonify(user, w)
	})

	m.Get("/users/me", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		user := c.MustGetUser()
		jsonify(user, w)
	}))
}

func parseAndValidate(r *http.Request, result interface{}) error {
	if err := parseBody(r, result); err != nil {
		return NewHttpError(http.StatusBadRequest)
	}

	if err := validator.Validate(result); err != nil {
		return NewHttpError(http.StatusBadRequest)
	}

	return nil
}

func parseBody(r *http.Request, result interface{}) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(result)
}

func jsonify(result interface{}, w http.ResponseWriter) {
	bytes, err := json.Marshal(result)
	if err != nil {
		panic(err)
	}

	writeAs(w, "application/json", bytes)
}

func writeAs(w http.ResponseWriter, contentType string, bytes []byte) {
	w.Header().Set("content-type", contentType)
	_, err := w.Write(bytes)
	if err != nil {
		panic(err)
	}

}

type FeedRequest struct {
	Title       string `validate:"nonzero,min=1"`
	Description string
}

type FeedItemRequest struct {
	Link        string `validate:"nonzero,min=1"`
	Title       string `validate:"nonzero,min=1"`
	Description string
}

func routeFeeds(m *Mux) {
	m.Get("/feeds", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feeds, err := c.Services.Feeds.GetAllJson(c.MustGetUser())
		if err != nil {
			panic(err)
		}
		writeAs(w, "application/json", feeds)
	}))

	m.Get("/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		feed, err := c.Services.Feeds.GetJson(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		writeAs(w, "application/json", feed)
	}))

	m.Get("/feeds/:feedID/rss", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		rss, err := c.Services.Feeds.GetRss(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		writeAs(w, "text/xml", rss)
	}))

	m.Post("/feeds", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		var feedReq FeedRequest
		if err := parseAndValidate(r, &feedReq); err != nil {
			panic(err)
		}
		feed := services.Feed{Title: feedReq.Title, Description: feedReq.Description}
		feed, err := c.Services.Feeds.Create(c.MustGetUser(), feed)
		if err != nil {
			panic(err)
		}
		jsonify(feed, w)
	}))

	m.Put("/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		var feedReq FeedRequest
		if err := parseAndValidate(r, &feedReq); err != nil {
			panic(err)
		}
		feedID := services.RecordID(c.URLParams["feedID"])
		feed := services.Feed{ID: feedID, Title: feedReq.Title}
		err := c.Services.Feeds.Update(c.MustGetUser(), feed)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Delete("/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		err := c.Services.Feeds.Delete(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Post("/feeds/:feedID/items", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		var itemReq FeedItemRequest
		if err := parseAndValidate(r, &itemReq); err != nil {
			panic(err)
		}
		item := services.FeedItem{FeedID: feedID, Link: itemReq.Link, Title: itemReq.Title, Description: itemReq.Description}
		itemID, err := c.Services.Feeds.AddItem(c.MustGetUser(), item)
		if err != nil {
			panic(err)
		}
		item.ID = itemID
		jsonify(item, w)
	}))

	m.Put("/feeds/:feedID/items/:itemID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		itemID := services.RecordID(c.URLParams["itemID"])
		var itemReq FeedItemRequest
		if err := parseAndValidate(r, &itemReq); err != nil {
			panic(err)
		}
		item := services.FeedItem{ID: itemID, Link: itemReq.Link, Title: itemReq.Title, Description: itemReq.Description}
		err := c.Services.Feeds.UpdateItem(c.MustGetUser(), item)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Delete("/feeds/:feedID/items/:itemID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		itemID := services.RecordID(c.URLParams["itemID"])
		err := c.Services.Feeds.DeleteItem(c.MustGetUser(), itemID)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

}
