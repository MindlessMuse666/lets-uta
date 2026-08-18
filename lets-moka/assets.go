package mokaassets

import "embed"

// StaticAssets keeps the brand files inside the standalone binary.
//
//go:embed favicon.ico logo_lets_moka_v1.png
var StaticAssets embed.FS
