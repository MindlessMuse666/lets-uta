package ass

import (
	"strings"
	"testing"
)

func TestParsePreservesCommasAndConvertsLineBreaks(t *testing.T) {
	input := "\ufeff[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.05,0:00:02.50,Default,,0,0,0,,\u590f\\N市場, with commas"

	dialogues, err := Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if len(dialogues) != 1 {
		t.Fatalf("got %d dialogues, want 1", len(dialogues))
	}
	if dialogues[0].StartMs != 1050 || dialogues[0].EndMs != 2500 {
		t.Fatalf("got timing %d-%d, want 1050-2500", dialogues[0].StartMs, dialogues[0].EndMs)
	}
	if dialogues[0].Text != "夏\n市場, with commas" {
		t.Fatalf("got text %q", dialogues[0].Text)
	}
}

func TestParseRejectsInvalidInput(t *testing.T) {
	tests := []string{
		"[Events]\nDialogue: 0,0:00:02.00,0:00:01.00,,,,,,,text",
		"[Events]\nDialogue: 0,bad,0:00:01.00,,,,,,,text",
		"[Script Info]\ntitle: no events",
	}
	for _, input := range tests {
		if _, err := Parse(strings.NewReader(input)); err == nil {
			t.Errorf("Parse(%q) returned nil error", input)
		}
	}
}

func TestParseRejectsNonUTF8(t *testing.T) {
	if _, err := Parse(strings.NewReader(string([]byte{0xff, 0xfe}))); err == nil {
		t.Fatal("Parse() accepted non-UTF-8 input")
	}
}
