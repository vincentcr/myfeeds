package main

import (
	"net/http"

	"github.com/vincentcr/myfeeds/api/services"
	"github.com/zenazn/goji"
	"github.com/zenazn/goji/web"
)

type Mux struct {
	svc *services.Services
}
type MyFeedsContext struct {
	web.C
	Services *services.Services
}

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

type NextFunc func()
type AbortReason struct {
	StatusCode int
	StatusText string
	Err        error
}
type AbortFunc func(abort AbortReason)
type middleware func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request, next NextFunc)
type handler func(c *MyFeedsContext, w http.ResponseWriter, r *http.Request)

func NewMux(svc *services.Services) *Mux {
	return &Mux{svc}
}

func (mux *Mux) Serve() {
	goji.Serve()
}

func (mux *Mux) Use(m middleware) {
	gojiMiddleware := func(c *web.C, h http.Handler) http.Handler {

		handlerFn := func(w http.ResponseWriter, r *http.Request) {
			sc := &MyFeedsContext{*c, mux.svc}
			c.Env["foo"] = 1
			next := func() {
				h.ServeHTTP(w, r)
			}
			m(sc, w, r, next)
		}

		return http.HandlerFunc(handlerFn)
	}

	goji.Use(gojiMiddleware)
}

func (mux *Mux) Delete(pattern web.PatternType, h handler) {
	goji.Delete(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Head(pattern web.PatternType, h handler) {
	goji.Head(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

// func (mux *Mux) get2(pattern web.PatternType, handlers ...handler2) {

// 	goji.Get(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
// 		sc := &MyFeedsContext{c, mux.svc}

// 		defer func() {

// 			if err := recover(); err != nil {
// 				var code int
// 				var text string

// 				if ar, ok := err.(AbortReason); ok {
// 					code = ar.StatusCode
// 					text = ar.StatusText
// 				} else {
// 					code = http.StatusInternalServerError
// 					text = http.StatusText(code)
// 					stack := debug.Stack()
// 					log.Printf("Internal error: %s\n%s\n", err, stack)
// 				}

// 				http.Error(w, text, code)
// 			}
// 		}()

// 		abort := func(reason AbortReason) {
// 			panic(reason)
// 		}

// 		for _, h := range handlers {
// 			h(sc, w, r, abort)
// 		}

// 	})
// }

func (mux *Mux) Get(pattern web.PatternType, h handler) {
	goji.Get(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Options(pattern web.PatternType, h handler) {
	goji.Options(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Patch(pattern web.PatternType, h handler) {
	goji.Patch(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Post(pattern web.PatternType, h handler) {
	goji.Post(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Put(pattern web.PatternType, h handler) {
	goji.Put(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}

func (mux *Mux) Trace(pattern web.PatternType, h handler) {
	goji.Trace(pattern, func(c web.C, w http.ResponseWriter, r *http.Request) {
		sc := &MyFeedsContext{c, mux.svc}
		h(sc, w, r)
	})
}
