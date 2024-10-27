package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

func GenerateToken(email string, userId int64) (string, error) {
	err := godotenv.Load(".env")
	if err != nil {
		return "", errors.New("could not load env")
	}

	secretKey := os.Getenv("SECRET_KEY")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email":  email,
		"userId": userId,
		"exp":    time.Now().Add(time.Hour * 2).Unix(),
	})
	return token.SignedString([]byte(secretKey))
}

func VerifyToken(token string) error {

	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		err := godotenv.Load(".env")
		secretKey := os.Getenv("SECRET_KEY")
		if err != nil {
			return nil, errors.New("couldn't load env file")
		}
		_, ok := token.Method.(*jwt.SigningMethodHMAC)
		if !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secretKey), nil
	})
	if err != nil {
		return errors.New("could not parse token")
	}

	tokenIsValid := parsedToken.Valid
	if !tokenIsValid {
		return errors.New("invalid token")
	}
	// claims, ok := parsedToken.Claims.(jwt.MapClaims)

	// if !ok {
	// 	return errors.New("invalid token claims")
	// }
	// email := claims["email"].(string)
	// userId := claims["userId"].(int64)

	return nil

}
