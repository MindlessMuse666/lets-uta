package media

import "testing"

func TestParseProbeJSONReadsFormatTagsAndDuration(t *testing.T) {
	data := []byte(`{"format":{"duration":"202.0604","tags":{"TITLE":"ドンドルマ","ARTIST":"LosstimeLife; guest","COMPOSER":"MASA WORKS DESIGN","COMMENT":"story"}},"streams":[]}`)

	metadata, err := ParseProbeJSON(data, ".mp3")
	if err != nil {
		t.Fatalf("ParseProbeJSON() error = %v", err)
	}
	if metadata.DurationMs != 202060 || metadata.MediaKind != "audio" {
		t.Fatalf("got duration/kind %d/%q", metadata.DurationMs, metadata.MediaKind)
	}
	if len(metadata.Artists) != 2 || metadata.Artists[1] != "guest" {
		t.Fatalf("got artists %#v", metadata.Artists)
	}
	if metadata.Title != "ドンドルマ" || metadata.Meaning != "story" {
		t.Fatalf("got title/meaning %q/%q", metadata.Title, metadata.Meaning)
	}
}

func TestParseProbeJSONUsesStreamTagsAsFallback(t *testing.T) {
	data := []byte(`{"format":{"duration":"1.5","tags":{}},"streams":[{"tags":{"artist":"Artist"}}]}`)
	metadata, err := ParseProbeJSON(data, ".mp4")
	if err != nil {
		t.Fatalf("ParseProbeJSON() error = %v", err)
	}
	if metadata.MediaKind != "video" || len(metadata.Artists) != 1 || metadata.Artists[0] != "Artist" {
		t.Fatalf("got %#v", metadata)
	}
}

func TestParseProbeJSONRejectsInvalidDuration(t *testing.T) {
	for _, data := range []string{
		`{"format":{"duration":"0","tags":{}}}`,
		`{"format":{"duration":"bad","tags":{}}}`,
		`not json`,
	} {
		if _, err := ParseProbeJSON([]byte(data), ".ogg"); err == nil {
			t.Errorf("ParseProbeJSON(%q) returned nil error", data)
		}
	}
}
