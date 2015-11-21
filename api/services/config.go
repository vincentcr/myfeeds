package services

import (
	"log"
	"os"
)

type Config struct {
	PublicURL    string
	Postgres     PGConfig
	PostgresAddr string
	RedisAddr    string
}
type PGConfig struct {
	Addr     string
	Database string
	User     string
	Password string
}

func loadConfig() (Config, error) {
	config, err := loadConfigFromEnv()
	log.Println("using config", config)
	return config, err
}

func loadConfigFromEnv() (Config, error) {
	return Config{
		PublicURL: os.Getenv("API_PUBLIC_URL"),
		RedisAddr: "redis:6379",
		Postgres: PGConfig{
			Addr:     "postgres:5432",
			Database: os.Getenv("POSTGRES_ENV_DB_NAME"),
			User:     os.Getenv("POSTGRES_ENV_DB_USER"),
			Password: os.Getenv("POSTGRES_ENV_DB_PASSWD"),
		},
	}, nil
}
