package mock

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	pathpkg "path"
	"regexp"
	"strings"
	"unicode"
)

type Timing struct {
	LineIndex int    `json:"lineIndex"`
	StartTime int64  `json:"startTime"`
	EndTime   int64  `json:"endTime"`
	Source    string `json:"source"`
}

type SecondaryLyric struct {
	Language string
	Text     string
}

type Input struct {
	Title          string
	FilePath       string
	MediaKind      string
	DurationMs     int64
	Meaning        *string
	Composers      []string
	Artists        []string
	PrimaryText    string
	Secondary      *SecondaryLyric
	PrimaryTimings []Timing
}

type song struct {
	Title      string   `json:"title"`
	FilePath   string   `json:"filePath"`
	MediaKind  string   `json:"mediaKind"`
	DurationMs int64    `json:"durationMs"`
	Meaning    *string  `json:"meaning"`
	Composers  []string `json:"composers"`
	Artists    []string `json:"artists"`
	Lyrics     []lyric  `json:"lyrics"`
}

type lyric struct {
	Language  string   `json:"language"`
	IsPrimary bool     `json:"isPrimary"`
	Text      string   `json:"text"`
	Timings   []Timing `json:"timings"`
}

var mediaPathPattern = regexp.MustCompile(`(?i)\.(mp3|mp4|ogg)$`)

func Validate(input Input) error {
	if strings.TrimSpace(input.Title) == "" {
		return errors.New("title is required")
	}
	if err := ValidateFilePath(input.FilePath); err != nil {
		return err
	}
	if input.MediaKind != "audio" && input.MediaKind != "video" {
		return errors.New("mediaKind must be audio or video")
	}
	extension := strings.ToLower(pathpkg.Ext(input.FilePath))
	if (input.MediaKind == "video" && extension != ".mp4") || (input.MediaKind == "audio" && extension == ".mp4") {
		return errors.New("mediaKind does not match filePath extension")
	}
	if input.DurationMs <= 0 {
		return errors.New("durationMs must be positive")
	}
	if err := validateList(input.Composers, "composers"); err != nil {
		return err
	}
	if err := validateList(input.Artists, "artists"); err != nil {
		return err
	}
	primaryText := normalizeText(input.PrimaryText)
	if strings.TrimSpace(primaryText) == "" {
		return errors.New("primary Japanese lyric is required")
	}
	if len(input.PrimaryTimings) != lineCount(primaryText) {
		return errors.New("timing count must match primary lyric line count")
	}
	if err := validateTimings(input.PrimaryTimings, input.DurationMs); err != nil {
		return err
	}
	if input.Meaning != nil && strings.TrimSpace(normalizeText(*input.Meaning)) == "" {
		return errors.New("meaning must contain text or be NULL")
	}
	if input.Secondary != nil {
		if input.Secondary.Language != "ru" && input.Secondary.Language != "en" {
			return errors.New("secondary language must be ru or en")
		}
		secondaryText := normalizeText(input.Secondary.Text)
		if strings.TrimSpace(secondaryText) == "" {
			return errors.New("secondary lyric text is required")
		}
		if lineCount(secondaryText) != lineCount(primaryText) {
			return errors.New("secondary lyric line count must match primary lyric")
		}
	}
	return nil
}

func Build(input Input) ([]byte, error) {
	if err := Validate(input); err != nil {
		return nil, err
	}
	primaryText := normalizeText(input.PrimaryText)
	lyrics := []lyric{{Language: "ja", IsPrimary: true, Text: primaryText, Timings: input.PrimaryTimings}}
	if input.Secondary != nil {
		lyrics = append(lyrics, lyric{Language: input.Secondary.Language, IsPrimary: false, Text: normalizeText(input.Secondary.Text), Timings: []Timing{}})
	}
	meaning := normalizeOptionalText(input.Meaning)
	result := []song{{
		Title: input.Title, FilePath: input.FilePath, MediaKind: input.MediaKind, DurationMs: input.DurationMs,
		Meaning: meaning, Composers: input.Composers, Artists: input.Artists, Lyrics: lyrics,
	}}
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(result); err != nil {
		return nil, fmt.Errorf("encode mock JSON: %w", err)
	}
	return buffer.Bytes(), nil
}

func ValidateFilePath(filePath string) error {
	if filePath == "" || strings.ContainsAny(filePath, "\\\x00?#") || strings.HasPrefix(filePath, "/") || strings.Contains(filePath, "://") {
		return errors.New("filePath must be a relative slash path")
	}
	parts := strings.Split(filePath, "/")
	if len(parts) < 2 {
		return errors.New("filePath must contain a directory and filename")
	}
	for _, part := range parts {
		if part == "" || part == "." || part == ".." {
			return errors.New("filePath contains an invalid path segment")
		}
		for _, character := range part {
			if unicode.IsControl(character) {
				return errors.New("filePath contains a control character")
			}
		}
	}
	if strings.Contains(parts[0], ":") || !mediaPathPattern.MatchString(filePath) {
		return errors.New("filePath must end with .mp3, .mp4 or .ogg")
	}
	return nil
}

func normalizeText(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "\r\n", "\n"), "\r", "\n")
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	normalized := normalizeText(*value)
	return &normalized
}

func lineCount(value string) int {
	return len(strings.Split(normalizeText(value), "\n"))
}

func validateList(values []string, field string) error {
	if len(values) == 0 {
		return fmt.Errorf("%s requires at least one value", field)
	}
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("%s cannot contain empty values", field)
		}
	}
	return nil
}

func validateTimings(timings []Timing, durationMs int64) error {
	for index, timing := range timings {
		if timing.LineIndex != index {
			return errors.New("timings must have sequential lineIndex values")
		}
		if timing.StartTime < 0 || timing.EndTime <= timing.StartTime || timing.EndTime > durationMs {
			return errors.New("timing values are outside the media duration")
		}
		if timing.Source != "auto" && timing.Source != "manual" && timing.Source != "import" {
			return errors.New("timing source is invalid")
		}
	}
	return nil
}

func BuildFilePath(subdirectory string, filename string) string {
	subdirectory = strings.Join(strings.FieldsFunc(strings.TrimSpace(subdirectory), func(character rune) bool {
		return character == ',' || unicode.IsSpace(character)
	}), "-")
	return pathpkg.Join("media", "fixtures", subdirectory, filename)
}
