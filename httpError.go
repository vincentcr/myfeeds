package main

import (
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/vincentcr/myfeeds/services"
)

type HttpError struct {
	StatusCode int
	StatusText string
	Data       interface{}
}

func NewHttpError(statusCode int) HttpError {
	statusText := http.StatusText(statusCode)
	return NewHttpErrorWithText(statusCode, statusText)
}

func NewHttpErrorWithText(statusCode int, statusText string) HttpError {
	return HttpError{StatusCode: statusCode, StatusText: statusText}
}

func (err HttpError) Error() string {
	return fmt.Sprintf("%v:%s", err.StatusCode, err.StatusText)
}

func (err HttpError) String() string {
	return err.Error()
}

func httpErrorRecovery(c *MyFeedsContext, w http.ResponseWriter, r *http.Request, next NextFunc) {

	defer func() {

		if err := recover(); err != nil {
			var code int
			var text string
			if httpErr, ok := err.(HttpError); ok {
				code = httpErr.StatusCode
				text = httpErr.StatusText
			} else if err == services.ErrNotFound {
				code = http.StatusNotFound
			} else if err == services.ErrUniqueViolation {
				code = http.StatusBadRequest
			} else {
				code = http.StatusInternalServerError
				stack := debug.Stack()
				log.Printf("Internal error: %s\n%s\n", err, stack)
			}

			if text == "" {
				text = http.StatusText(code)
			}

			http.Error(w, text, code)
		}
	}()

	next()
}
