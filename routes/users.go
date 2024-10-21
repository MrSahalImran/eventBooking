package routes

import (
	"net/http"

	"github.com/MrSahalImran/event-booking/models"
	"github.com/gin-gonic/gin"
)

func signup(context *gin.Context) {
	var user models.User
	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "could not parse request data",
		})
		return
	}

	err = user.Save()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{
			"message": "could not save user. Try again later",
		})
		return
	}

	context.JSON(http.StatusCreated, gin.H{
		"message": "user created successfully",
	})

}

func login(context *gin.Context) {
	var user models.User
	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{
			"message": "could not parse request data",
		})
		return
	}

	err = user.ValidateCredentials()
	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{
			"message": "could not authenticate user",
		})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Login successfull"})

}
