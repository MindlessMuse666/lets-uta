package media

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type Metadata struct {
	DurationMs int64
	MediaKind  string
	FormatName string
	Title      string
	Artists    []string
	Composers  []string
	Meaning    string
}

type probeOutput struct {
	Format struct {
		Duration   string            `json:"duration"`
		FormatName string            `json:"format_name"`
		Tags       map[string]string `json:"tags"`
	} `json:"format"`
	Streams []struct {
		Tags map[string]string `json:"tags"`
	} `json:"streams"`
}

func Probe(ctx context.Context, executable string, mediaPath string) (Metadata, error) {
	command := exec.CommandContext(ctx, executable, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", "--", mediaPath)
	output, err := command.Output()
	if err != nil {
		if ctx.Err() != nil {
			return Metadata{}, fmt.Errorf("ffprobe timed out: %w", ctx.Err())
		}
		return Metadata{}, errors.New("ffprobe failed")
	}
	return ParseProbeJSON(output, filepath.Ext(mediaPath))
}

func ParseProbeJSON(data []byte, extension string) (Metadata, error) {
	var probe probeOutput
	if err := json.Unmarshal(data, &probe); err != nil {
		return Metadata{}, errors.New("ffprobe returned invalid JSON")
	}
	durationSeconds, err := strconv.ParseFloat(strings.TrimSpace(probe.Format.Duration), 64)
	if err != nil || math.IsNaN(durationSeconds) || math.IsInf(durationSeconds, 0) || durationSeconds <= 0 {
		return Metadata{}, errors.New("ffprobe returned an invalid duration")
	}
	durationMs := int64(math.Round(durationSeconds * 1000))
	if durationMs <= 0 {
		return Metadata{}, errors.New("media duration must be positive")
	}

	tags := normalizeTags(probe.Format.Tags)
	for _, stream := range probe.Streams {
		for key, value := range normalizeTags(stream.Tags) {
			if _, exists := tags[key]; !exists {
				tags[key] = value
			}
		}
	}
	metadata := Metadata{
		DurationMs: durationMs,
		MediaKind:  KindForExtension(extension),
		FormatName: strings.ToLower(strings.TrimSpace(probe.Format.FormatName)),
		Title:      firstTag(tags, "title", "track", "name"),
		Artists:    splitList(firstTag(tags, "artist", "album_artist", "performer")),
		Composers:  splitList(firstTag(tags, "composer", "composer_name", "writer")),
		Meaning:    firstTag(tags, "comment", "description"),
	}
	return metadata, nil
}

func IsCompatibleFormat(extension string, formatName string) bool {
	if strings.TrimSpace(formatName) == "" {
		return true
	}
	formatName = strings.ToLower(formatName)
	switch strings.ToLower(extension) {
	case ".mp3":
		return strings.Contains(formatName, "mp3")
	case ".ogg":
		return strings.Contains(formatName, "ogg")
	case ".mp4":
		return strings.Contains(formatName, "mp4") || strings.Contains(formatName, "mov")
	default:
		return false
	}
}

func KindForExtension(extension string) string {
	if strings.EqualFold(extension, ".mp4") {
		return "video"
	}
	return "audio"
}

func normalizeTags(tags map[string]string) map[string]string {
	normalized := make(map[string]string, len(tags))
	for key, value := range tags {
		normalized[strings.ToLower(strings.TrimSpace(key))] = strings.TrimSpace(value)
	}
	return normalized
}

func firstTag(tags map[string]string, aliases ...string) string {
	for _, alias := range aliases {
		if value := strings.TrimSpace(tags[alias]); value != "" {
			return value
		}
	}
	return ""
}

func splitList(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ';' || r == '/' || r == ','
	})
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
