package mock

import (
	"encoding/json"
	"strings"
	"testing"
)

func validInput() Input {
	meaning := "line one\nline two"
	return Input{
		Title:       "ドンドルマ",
		FilePath:    "media/fixtures/MASA-WORKS-DESIGN/song name.mp3",
		MediaKind:   "audio",
		DurationMs:  5000,
		Meaning:     &meaning,
		Composers:   []string{"MASA WORKS DESIGN"},
		Artists:     []string{"LosstimeLife"},
		PrimaryText: "夏\r\n市場",
		PrimaryTimings: []Timing{
			{LineIndex: 0, StartTime: 1000, EndTime: 2000, Source: "import"},
			{LineIndex: 1, StartTime: 2500, EndTime: 4000, Source: "import"},
		},
		Secondary: &SecondaryLyric{Language: "ru", Text: "Лето\nРынок"},
	}
}

func TestBuildPreservesUnicodeNewlinesAndSharedTimingContract(t *testing.T) {
	data, err := Build(validInput())
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	var result []map[string]any
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(result) != 1 || result[0]["title"] != "ドンドルマ" {
		t.Fatalf("unexpected result: %s", data)
	}
	lyrics := result[0]["lyrics"].([]any)
	if lyrics[0].(map[string]any)["text"] != "夏\n市場" {
		t.Fatalf("primary text did not normalize: %s", data)
	}
	if len(lyrics[1].(map[string]any)["timings"].([]any)) != 0 {
		t.Fatal("secondary lyric owns timings")
	}
	if !strings.Contains(string(data), "ドンドルマ") || !strings.Contains(string(data), "\\n") {
		t.Fatalf("JSON was not UTF-8 or escaped as expected: %s", data)
	}
}

func TestBuildAllowsNullableMeaning(t *testing.T) {
	input := validInput()
	input.Meaning = nil
	data, err := Build(input)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if !strings.Contains(string(data), `"meaning": null`) {
		t.Fatalf("meaning was not null: %s", data)
	}
}

func TestBuildNormalizesMeaningLineEndings(t *testing.T) {
	input := validInput()
	meaning := "one\r\ntwo"
	input.Meaning = &meaning
	data, err := Build(input)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if !strings.Contains(string(data), "one\\ntwo") {
		t.Fatalf("meaning line endings were not normalized: %s", data)
	}
}

func TestValidateRejectsBrokenBoundaries(t *testing.T) {
	tests := []struct {
		name string
		edit func(*Input)
	}{
		{"bad path", func(input *Input) { input.FilePath = "../song.mp3" }},
		{"unsupported media kind", func(input *Input) { input.MediaKind = "image" }},
		{"media kind extension mismatch", func(input *Input) { input.MediaKind = "video" }},
		{"timing beyond duration", func(input *Input) { input.PrimaryTimings[1].EndTime = 5001 }},
		{"translation line mismatch", func(input *Input) { input.Secondary.Text = "one" }},
		{"empty artist", func(input *Input) { input.Artists = nil }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput()
			test.edit(&input)
			if err := Validate(input); err == nil {
				t.Fatal("Validate() returned nil error")
			}
		})
	}
}

func TestValidateFilePath(t *testing.T) {
	valid := []string{"media/fixtures/A-B/song name.mp3", "media/fixtures/作品/曲.OGG"}
	for _, value := range valid {
		if err := ValidateFilePath(value); err != nil {
			t.Errorf("ValidateFilePath(%q) error = %v", value, err)
		}
	}
	invalid := []string{"song.mp3", "/tmp/song.mp3", `C:\\song.mp3`, "media/../song.mp3", "media/song.wav", "media/song.mp3?x=1"}
	for _, value := range invalid {
		if err := ValidateFilePath(value); err == nil {
			t.Errorf("ValidateFilePath(%q) returned nil error", value)
		}
	}
}

func TestBuildFilePathReplacesOnlySubdirectorySpaces(t *testing.T) {
	got := BuildFilePath("MASA WORKS DESIGN", "song name.mp3")
	if got != "media/fixtures/MASA-WORKS-DESIGN/song name.mp3" {
		t.Fatalf("got %q", got)
	}
}

func TestBuildFilePathNormalizesArtistSeparators(t *testing.T) {
	got := BuildFilePath("MASA WORKS DESIGN, 初音ミク", "HEAVEN.mp3")
	if got != "media/fixtures/MASA-WORKS-DESIGN-初音ミク/HEAVEN.mp3" {
		t.Fatalf("got %q", got)
	}
}
