APP_NAME  = myfeeds
ENV      ?= dev
DBNAME   ?= $(APP_NAME)_$(ENV)
DBUSER   ?= $(APP_NAME)_$(ENV)
DBPASSWD ?= $(APP_NAME)_$(ENV)_secret

PSQL_CMD = cd sql && psql -v ON_ERROR_STOP=1
GO_SRC   = $(shell find . -type f -name '*.go')
SQL_SRC  = $(shell find sql -type f)

default: build

build: $(APP_NAME)
$(APP_NAME): $(GO_SRC)
	godep go build -o $(APP_NAME) .

dev: build db-views
	./$(APP_NAME) -bind :3000

db-dev:
	$(MAKE) db-recreate
	$(MAKE) db-dev-data

.PHONY: db-schema
db-schema: $(SQL_SRC)
	$(PSQL_CMD) -d $(DBNAME) -U $(DBUSER) -f ./schema.sql
	$(MAKE) db-views

.PHONY: db-schema
db-views: $(SQL_SRC)
	$(PSQL_CMD) -d $(DBNAME) -U $(DBUSER) -f ./views.sql

db-dev-data: $(SQL_SRC)
	$(PSQL_CMD) -d $(DBNAME) -U $(DBUSER) -f ./dev.sql

db-recreate:
	$(MAKE) db-drop || true
	$(MAKE) db-create

db-drop: redis-flush
	dropdb $(DBNAME)
	dropuser $(DBUSER)

redis-flush:
	redis-cli flushall

db-create:
	$(PSQL_CMD) --set=dbuser=$(DBUSER) --set=dbpasswd=$(DBPASSWD) --set=dbname=$(DBNAME) -f ./db.sql
	$(MAKE) db-schema

clean:
	rm -f $(APP_NAME)
