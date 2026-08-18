package web

import (
	"bytes"
	"html"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"lets-moka/internal/media"
)

const probeJSON = `{"format":{"duration":"5.0","format_name":"mp3","tags":{"TITLE":"Probe title","ARTIST":"LosstimeLife; guest","COMPOSER":"MASA WORKS DESIGN","COMMENT":"A short story"}},"streams":[]}`
const assFixture = "\ufeff[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,,,,,Hello, world\nDialogue: 0,0:00:03.00,0:00:04.00,Default,,,,,,日本語\n"

func TestGenerateReturnsPreviewAndPreservesContract(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	request := multipartRequest(t, map[string]string{
		"title":             "Edited title",
		"secondaryLanguage": "ru",
		"secondaryText":     "Первая строка\nВторая строка",
	}, upload{name: "song name.mp3", field: "media", content: []byte("media")}, upload{name: "captions.ass", field: "ass", content: []byte(assFixture)})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	body := response.Body.String()
	decoded := html.UnescapeString(body)
	for _, expected := range []string{`"title": "Edited title"`, `"filePath": "media/fixtures/LosstimeLife/song name.mp3"`, `"durationMs": 5000`, `"source": "import"`, `"timings": []`, `Hello, world`, `日本語`} {
		if !strings.Contains(decoded, expected) {
			t.Errorf("response does not contain %q: %s", expected, body)
		}
	}
}

func TestGenerateRejectsUnsupportedMediaWithoutPartialJSON(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	request := multipartRequest(t, map[string]string{"title": "Сохранённое название"}, upload{name: "song.wav", field: "media", content: []byte("media")}, upload{name: "captions.ass", field: "ass", content: []byte("[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,,,,,line")})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)

	if response.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "Сохранённое название") || strings.Contains(response.Body.String(), "JSON-мок собран") {
		t.Fatalf("form state or partial preview was lost: %s", response.Body.String())
	}
}

func TestGenerateWithoutASSReturnsMetadataForFormRefresh(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	request := multipartRequest(t, map[string]string{"title": "Manual title"}, upload{name: "song.mp3", field: "media", content: []byte("media")})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	body := html.UnescapeString(response.Body.String())
	for _, expected := range []string{"Manual title", `value="5000"`, "LosstimeLife, guest", "MASA WORKS DESIGN"} {
		if !strings.Contains(body, expected) {
			t.Errorf("metadata refresh response does not contain %q: %s", expected, body)
		}
	}
}

func TestGenerateRejectsBodyOverConfiguredLimit(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t), MaxBodyBytes: 512})
	request := multipartRequest(t, nil, upload{name: "song.mp3", field: "media", content: bytes.Repeat([]byte("x"), 2048)})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusRequestEntityTooLarge || !strings.Contains(response.Body.String(), "слишком большой") {
		t.Fatalf("unexpected size response: %d %s", response.Code, response.Body.String())
	}
}

func TestGenerateRejectsTranslationMismatchAndNullableMeaning(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	request := multipartRequest(t, map[string]string{
		"meaning":           "Visual value",
		"meaningNull":       "true",
		"primaryText":       "First\nSecond",
		"secondaryLanguage": "en",
		"secondaryText":     "Only one",
	}, upload{name: "song.mp3", field: "media", content: []byte("media")}, upload{name: "captions.ass", field: "ass", content: []byte("[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,,,,,First\nDialogue: 0,0:00:03.00,0:00:04.00,Default,,,,,,Second")})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "число строк") {
		t.Fatalf("unexpected mismatch response: %d %s", response.Code, response.Body.String())
	}

	request = multipartRequest(t, map[string]string{"meaning": "Visual value", "meaningNull": "true"}, upload{name: "song.mp3", field: "media", content: []byte("media")}, upload{name: "captions.ass", field: "ass", content: []byte("[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,,,,,First")})
	response = httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(html.UnescapeString(response.Body.String()), `"meaning": null`) {
		t.Fatalf("nullable meaning was not serialized: %d %s", response.Code, response.Body.String())
	}
}

func TestHealthAndStaticAssets(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	for _, test := range []struct {
		path        string
		contentType string
	}{
		{path: "/healthz", contentType: "application/json"},
		{path: "/static/styles.css", contentType: "text/css"},
		{path: "/static/app.js", contentType: "text/javascript"},
		{path: "/static/favicon.ico", contentType: "image/x-icon"},
		{path: "/static/logo_lets_moka_v1.png", contentType: "image/png"},
	} {
		request := httptest.NewRequest(http.MethodGet, test.path, nil)
		response := httptest.NewRecorder()
		server.ServeHTTP(response, request)
		if response.Code != http.StatusOK || !strings.Contains(response.Header().Get("Content-Type"), test.contentType) {
			t.Errorf("%s: status/content type = %d/%q", test.path, response.Code, response.Header().Get("Content-Type"))
		}
	}
}

func TestIndexWiresBrandAssets(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	body := response.Body.String()
	for _, expected := range []string{
		`rel="icon" href="/static/favicon.ico"`,
		`src="/static/logo_lets_moka_v1.png"`,
		`accept=".mp3,.mp4,.ogg"`,
		`accept=".ass"`,
		`data-lyrics-editor`,
		`data-line-count`,
	} {
		if !strings.Contains(body, expected) {
			t.Errorf("index does not wire %q: %s", expected, body)
		}
	}
}

func TestAppScriptContainsInteractiveFormStates(t *testing.T) {
	server := NewServer(Config{FFProbeExecutable: fakeFFProbe(t)})
	response := httptest.NewRecorder()
	server.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/static/app.js", nil))

	body := response.Body.String()
	for _, expected := range []string{"Выбранные файлы сохранены", "DataTransfer", "Let's Mock!", "secondaryText"} {
		if !strings.Contains(body, expected) {
			t.Errorf("app.js does not contain %q", expected)
		}
	}
}

func TestApplyMetadataUsesArtistDirectoryForHeavenFixture(t *testing.T) {
	state := FormState{}
	applyMetadata(&state, media.Metadata{
		DurationMs: 197033,
		MediaKind:  "audio",
		Title:      "HEAVEN",
		Artists:    []string{"MASA WORKS DESIGN", "初音ミク"},
	}, "MASA WORKS DESIGN ft.初音ミク - HEAVEN.mp3")

	if state.FilePath != "media/fixtures/MASA-WORKS-DESIGN/MASA WORKS DESIGN ft.初音ミク - HEAVEN.mp3" {
		t.Fatalf("file path = %q", state.FilePath)
	}
}

func fakeFFProbe(t *testing.T) string {
	t.Helper()
	directory := t.TempDir()
	source := filepath.Join(directory, "main.go")
	binary := filepath.Join(directory, "fake-ffprobe.exe")
	program := "package main\n\nimport \"fmt\"\n\nfunc main() { fmt.Print(" + strconv.Quote(probeJSON) + ") }\n"
	if err := os.WriteFile(source, []byte(program), 0o600); err != nil {
		t.Fatal(err)
	}
	command := exec.Command("go", "build", "-o", binary, source)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("build fake ffprobe: %v: %s", err, output)
	}
	return binary
}

type upload struct {
	field   string
	name    string
	content []byte
}

func multipartRequest(t *testing.T, fields map[string]string, uploads ...upload) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatal(err)
		}
	}
	for _, file := range uploads {
		part, err := writer.CreateFormFile(file.field, filepath.Base(file.name))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := io.Copy(part, bytes.NewReader(file.content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/generate", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}
