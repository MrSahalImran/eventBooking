package models

import "time"

type Event struct {
	ID          int
	Name        string    `binding:"require"`
	Description string    `binding:"require"`
	Location    string    `binding:"require"`
	DateTime    time.Time `binding:"require"`
	UserID      int
}

var events = []Event{}

func (e Event) Save() {
	// later: add it to database
	events = append(events, e)
}

func GetAllEvents() []Event {
	return events
}
