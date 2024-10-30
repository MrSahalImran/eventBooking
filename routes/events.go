package routes

import (
	"net/http"
	"strconv"

	"github.com/MrSahalImran/event-booking/models"
	"github.com/gin-gonic/gin"
)

func getEvents(context *gin.Context) {
	events, err := models.GetAllEvents()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "could not fetch events. Try again later.",
		})
		return
	}
	context.JSON(http.StatusOK, events)
}

func createEvent(context *gin.Context) {
	var event models.Event
	err := context.ShouldBindJSON(&event)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data", "error": err,
		})
		return
	}

	userId := context.GetInt64("userId")
	event.UserID = userId
	err = event.Save()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "could not create event. Try again later.",
		})
		return
	}
	context.JSON(http.StatusCreated, gin.H{
		"message": "Event created!",
		"event":   event,
	})
}

func getEvent(context *gin.Context) {
	id, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "could not parse event id. Try again",
		})
		return
	}
	event, err := models.GetEvent(id)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Event not found. Try again",
		})
		return
	}
	context.JSON(http.StatusOK, event)
}

func updateEvent(context *gin.Context) {
	id, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "could not parse event id. Try again",
		})
		return
	}

	userId := context.GetInt64("userId")
	event, err := models.GetEvent(id)

	if event.UserID != userId {
		context.JSON(http.StatusUnauthorized, gin.H{
			"message": "Not authorized to update event",
		})
		return
	}

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Event not found. Try again",
		})
		return
	}

	var updatedEvent models.Event
	err = context.ShouldBindJSON(&updatedEvent)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "Could not parse request data",
		})
		return
	}
	updatedEvent.ID = id
	err = updatedEvent.Update()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "Could not update event",
		})
		return
	}
	context.JSON(http.StatusOK, gin.H{
		"message": "Event updated successfully",
	})
}

func deleteEvent(context *gin.Context) {
	id, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "could not parse id. Try again",
		})
		return
	}
	userId := context.GetInt64("userId")
	event, err := models.GetEvent(id)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "could not found event. Try again",
		})
		return
	}

	if event.UserID != userId {
		context.JSON(http.StatusUnauthorized, gin.H{
			"message": "Not authorized to delete event.",
		})
		return
	}

	err = event.Delete()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "could not delete the event. Try again",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "event deleted successfully",
	})
}
