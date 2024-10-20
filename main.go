package main

import (
	"github.com/MrSahalImran/event-booking/db"
	"github.com/MrSahalImran/event-booking/routes"
	"github.com/gin-gonic/gin"
)

func main() {
	db.InitDB()
	server := gin.Default()

	routes.RegisterRoutes(server)

	server.Run(":8080")
}
