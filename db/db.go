package db

import (
	"database/sql"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func InitDB() {
	var err error

	dsn := "postgres://postgres:password@app-db-1.cxma0kma6g4x.us-east-2.rds.amazonaws.com:5432/eventdb?sslmode=require"

	DB, err = sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("could not connect to database:", err)
	}

	// Connection pool settings
	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	// Verify connection
	if err := DB.Ping(); err != nil {
		log.Fatal("database not reachable:", err)
	}

	createTables()
	log.Println("PostgreSQL connected successfully")
}

func createTables() {
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL
	);
	`

	_, err := DB.Exec(createUsersTable)
	if err != nil {
		log.Fatal("could not create users table:", err)
	}

	createEventsTable := `
	CREATE TABLE IF NOT EXISTS events (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		location TEXT NOT NULL,
		date_time TIMESTAMP NOT NULL,
		user_id INTEGER,
		CONSTRAINT fk_user
			FOREIGN KEY(user_id)
			REFERENCES users(id)
			ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(createEventsTable)
	if err != nil {
		log.Fatal("could not create events table:", err)
	}

	createRegistrationsTable := `
	CREATE TABLE IF NOT EXISTS registrations (
		id SERIAL PRIMARY KEY,
		event_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		CONSTRAINT fk_event
			FOREIGN KEY(event_id)
			REFERENCES events(id)
			ON DELETE CASCADE,
		CONSTRAINT fk_user
			FOREIGN KEY(user_id)
			REFERENCES users(id)
			ON DELETE CASCADE,
		UNIQUE(event_id, user_id)
	);
	`

	_, err = DB.Exec(createRegistrationsTable)
	if err != nil {
		log.Fatal("could not create registrations table:", err)
	}
}
