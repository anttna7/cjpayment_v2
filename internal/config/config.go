package config

import (
	"os"
	"github.com/spf13/viper"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	LogLevel string         `mapstructure:"log_level"`
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port         string `mapstructure:"port"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Driver   string `mapstructure:"driver"`
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
	DSN      string `mapstructure:"dsn"`
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpireTime int    `mapstructure:"expire_time"`
}

// Load loads configuration from file and environment variables
func Load() (*Config, error) {
	// Check for custom config file
	if configFile := os.Getenv("CONFIG_FILE"); configFile != "" {
		viper.SetConfigFile(configFile)
	} else {
		// Check for environment-specific config
		env := os.Getenv("CONFIG_ENV")
		if env != "" {
			viper.SetConfigName("config." + env)
		} else {
			viper.SetConfigName("config")
		}
		viper.SetConfigType("yaml")
		viper.AddConfigPath("./configs")
		viper.AddConfigPath(".")
	}

	// Set default values
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.read_timeout", 30)
	viper.SetDefault("server.write_timeout", 30)
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.sslmode", "disable")
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("jwt.expire_time", 3600)
	viper.SetDefault("log_level", "info")

	// Enable environment variable binding
	viper.AutomaticEnv()

	// Read configuration file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
