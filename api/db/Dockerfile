FROM postgres:9.4

ENV DB_NAME=myfeeds_dev
ENV DB_USER=myfeeds_dev
ENV DB_PASSWD=myfeeds_dev_very_secret
ENV SQL_DIR=/docker-entrypoint-initdb.d

RUN mkdir -p $SQL_DIR
WORKDIR $SQL_DIR
COPY . $SQL_DIR
