package web

import "embed"

// Assets contains the complete browser surface served by the standalone binary.
//
//go:embed index.html styles.css app.js
var Assets embed.FS
