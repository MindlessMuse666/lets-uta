package ass

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

type Dialogue struct {
	StartMs int64
	EndMs   int64
	Text    string
}

var timePattern = regexp.MustCompile(`^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,2}))?$`)
var overridePattern = regexp.MustCompile(`\{[^}]*\}`)

func Parse(reader io.Reader) ([]Dialogue, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("read ASS: %w", err)
	}
	if !utf8.Valid(data) {
		return nil, errors.New("ASS is not valid UTF-8")
	}

	data = bytes.TrimPrefix(data, []byte{0xef, 0xbb, 0xbf})
	lines := strings.Split(strings.ReplaceAll(string(data), "\r\n", "\n"), "\n")
	inEvents := false
	var dialogues []Dialogue

	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		if strings.EqualFold(line, "[Events]") {
			inEvents = true
			continue
		}
		if inEvents && strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			inEvents = false
			continue
		}
		if !inEvents || strings.HasPrefix(line, ";") || strings.HasPrefix(line, "Format:") || strings.HasPrefix(line, "Comment:") {
			continue
		}
		if !strings.HasPrefix(line, "Dialogue:") {
			continue
		}

		parts := strings.SplitN(strings.TrimSpace(strings.TrimPrefix(line, "Dialogue:")), ",", 10)
		for len(parts) < 10 {
			parts = append(parts, "")
		}
		startMs, err := ParseTime(parts[1])
		if err != nil {
			return nil, fmt.Errorf("invalid Dialogue start time: %w", err)
		}
		endMs, err := ParseTime(parts[2])
		if err != nil {
			return nil, fmt.Errorf("invalid Dialogue end time: %w", err)
		}
		if endMs <= startMs {
			return nil, errors.New("Dialogue end time must be greater than start time")
		}

		text := strings.TrimSpace(parts[9])
		if len(text) >= 2 && text[0] == '"' && text[len(text)-1] == '"' {
			text = text[1 : len(text)-1]
		}
		text = strings.ReplaceAll(text, `\N`, "\n")
		text = overridePattern.ReplaceAllString(text, "")
		dialogues = append(dialogues, Dialogue{StartMs: startMs, EndMs: endMs, Text: text})
	}

	if len(dialogues) == 0 {
		return nil, errors.New("ASS contains no Dialogue lines")
	}
	return dialogues, nil
}

func ParseTime(value string) (int64, error) {
	value = strings.TrimSpace(value)
	matches := timePattern.FindStringSubmatch(value)
	if matches == nil {
		return 0, fmt.Errorf("unsupported ASS time %q", value)
	}
	hours, _ := strconv.ParseInt(matches[1], 10, 64)
	minutes, _ := strconv.ParseInt(matches[2], 10, 64)
	seconds, _ := strconv.ParseInt(matches[3], 10, 64)
	centiseconds := int64(0)
	if matches[4] != "" {
		centiseconds, _ = strconv.ParseInt(matches[4], 10, 64)
		if len(matches[4]) == 1 {
			centiseconds *= 10
		}
	}
	return ((hours*60+minutes)*60+seconds)*1000 + centiseconds*10, nil
}
