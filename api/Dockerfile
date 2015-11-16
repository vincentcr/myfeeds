FROM golang:1.4

RUN go get github.com/tools/godep
ENV APP_DIR=$GOPATH/src/github.com/vincentcr/myfeeds/api

RUN mkdir -p $APP_DIR
WORKDIR $APP_DIR
COPY . $APP_DIR
RUN godep go build -o app .

ENV PORT=3456

EXPOSE ${PORT}

CMD sh- "sleep 1 && $APP_DIR/app :${PORT}"
