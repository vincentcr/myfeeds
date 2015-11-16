package services

import (
	"fmt"
	"log"
	"os"
	"strings"
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
		RedisAddr: getServiceAddress("redis", 6379),
		Postgres: PGConfig{
			Addr:     getServiceAddress("postgres", 5432),
			Database: os.Getenv("DB_NAME"),
			User:     os.Getenv("DB_USER"),
			Password: os.Getenv("DB_PASSWD"),
		},
	}, nil
}

func getServiceAddress(name string, defaultPort int) string {
	addr := os.Getenv(fmt.Sprintf("%v_PORT_%v_TCP_ADDR", strings.ToUpper(name), defaultPort))
	port := os.Getenv(fmt.Sprintf("%v_PORT_%v_TCP_PORT", strings.ToUpper(name), defaultPort))
	if addr == "" || port == "" {
		return ""
	} else {
		return fmt.Sprintf("%v:%v", addr, port)
	}
}
