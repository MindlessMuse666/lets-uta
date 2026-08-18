package main

import (
	"log"
	"net/http"

	"lets-moka/internal/web"
)

func main() {
	server := &http.Server{
		Addr:    "127.0.0.1:8080",
		Handler: web.New("ffprobe"),
	}
	log.Printf("Let's Moka! listening on http://%s", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
