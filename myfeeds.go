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
	m.Use(cors)
	m.Use(httpErrorRecovery)
	m.Use(authenticate)
}

func cors(c *MyFeedsContext, w http.ResponseWriter, r *http.Request, next NextFunc) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization,Accept,Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD")
	next()
}

type UserRequest struct {
	Email    string `validate:"nonzero,regexp=^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[[:alnum:]]{2,}$"`
	Password string `validate:"nonzero,min=6"`
}

func routeUsers(m *Mux) {

	m.Post("/api/v1/users", func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
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

		token, err := c.Services.Users.CreateToken(user)
		if err != nil {
			panic(err)
		}

		res := map[string]interface{}{
			"user":  user,
			"token": token,
		}
		jsonify(res, w)
	})

	m.Post("/api/v1/users/tokens", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		user := c.MustGetUser()
		token, err := c.Services.Users.CreateToken(user)
		if err != nil {
			panic(err)
		}

		res := map[string]interface{}{
			"user":  user,
			"token": token,
		}
		jsonify(res, w)
	}))

	m.Get("/api/v1/users/me", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
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

func routeFeeds(m *Mux) {
	m.Get("/api/v1/feeds", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feeds, err := c.Services.Feeds.GetAllJson(c.MustGetUser())
		if err != nil {
			panic(err)
		}
		writeAs(w, "application/json", feeds)
	}))

	m.Get("/api/v1/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		feed, err := c.Services.Feeds.GetJson(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		writeAs(w, "application/json", feed)
	}))

	m.Get("/api/v1/feeds/:feedID/rss", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		rss, err := c.Services.Feeds.GetRss(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		writeAs(w, "text/xml", rss)
	}))

	m.Post("/api/v1/feeds", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		var feed services.Feed
		if err := parseFeedRequest(r, &feed); err != nil {
			panic(err)
		}
		err := c.Services.Feeds.Create(c.MustGetUser(), &feed)
		if err != nil {
			panic(err)
		}
		jsonify(feed, w)
	}))

	m.Put("/api/v1/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		feed := services.Feed{ID: feedID}
		if err := parseFeedRequest(r, &feed); err != nil {
			panic(err)
		}
		err := c.Services.Feeds.Update(c.MustGetUser(), feed)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Delete("/api/v1/feeds/:feedID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		err := c.Services.Feeds.Delete(c.MustGetUser(), feedID)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Post("/api/v1/feeds/:feedID/items", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		feedID := services.RecordID(c.URLParams["feedID"])
		item := services.FeedItem{FeedID: feedID}
		if err := parseFeedItemRequest(r, &item); err != nil {
			panic(err)
		}
		err := c.Services.Feeds.AddItem(c.MustGetUser(), &item)
		if err != nil {
			panic(err)
		}
		jsonify(item, w)
	}))

	m.Put("/api/v1/feeds/:feedID/items/:itemID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		itemID := services.RecordID(c.URLParams["itemID"])
		item := services.FeedItem{ID: itemID}
		if err := parseFeedItemRequest(r, &item); err != nil {
			panic(err)
		}
		err := c.Services.Feeds.UpdateItem(c.MustGetUser(), item)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	m.Delete("/api/v1/feeds/:feedID/items/:itemID", mustAuthenticate(func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request) {
		itemID := services.RecordID(c.URLParams["itemID"])
		err := c.Services.Feeds.DeleteItem(c.MustGetUser(), itemID)
		if err != nil {
			panic(err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
}

type FeedRequest struct {
	Title       string `validate:"nonzero,min=1"`
	Description string
}

func parseFeedRequest(r *http.Request, feed *services.Feed) error {
	var feedReq FeedRequest
	if err := parseAndValidate(r, &feedReq); err != nil {
		return err
	}
	feed.Title = feedReq.Title
	feed.Description = feedReq.Description
	return nil
}

type FeedItemRequest struct {
	Link        string `validate:"nonzero,min=1"`
	Title       string `validate:"nonzero,min=1"`
	Description string
}

func parseFeedItemRequest(r *http.Request, item *services.FeedItem) error {
	var itemReq FeedItemRequest
	if err := parseAndValidate(r, &itemReq); err != nil {
		return err
	}
	item.Link = itemReq.Link
	item.Title = itemReq.Title
	item.Description = itemReq.Description
	return nil
}
