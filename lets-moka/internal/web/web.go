package web

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	mokaassets "lets-moka"
	"lets-moka/internal/ass"
	"lets-moka/internal/media"
	"lets-moka/internal/mock"
	assets "lets-moka/web"
)

const (
	maxMediaBytes  = 100 * 1024 * 1024
	maxBodyPadding = 1 * 1024 * 1024
)

type Config struct {
	FFProbeExecutable string
	MaxBodyBytes      int64
	ProbeTimeout      time.Duration
}

type Server struct {
	config   Config
	template *template.Template
}

type FormState struct {
	Title             string
	FilePath          string
	MediaKind         string
	DurationMs        string
	Artists           string
	Composers         string
	Meaning           string
	MeaningNull       bool
	PrimaryText       string
	SecondaryLanguage string
	SecondaryText     string
	MediaFilename     string
	ASSFilename       string
	Error             string
	StatusCode        int
	Result            string
	DownloadName      string
	HasResult         bool
}

func New(ffprobeExecutable string) http.Handler {
	return NewServer(Config{FFProbeExecutable: ffprobeExecutable})
}

func NewServer(config Config) http.Handler {
	if config.FFProbeExecutable == "" {
		config.FFProbeExecutable = "ffprobe"
	}
	if config.MaxBodyBytes <= 0 {
		config.MaxBodyBytes = maxMediaBytes + maxBodyPadding
	}
	if config.ProbeTimeout <= 0 {
		config.ProbeTimeout = 20 * time.Second
	}
	parsed, err := template.ParseFS(assets.Assets, "index.html")
	if err != nil {
		panic(fmt.Sprintf("parse embedded web template: %v", err))
	}
	return &Server{config: config, template: parsed}
}

func (s *Server) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	switch {
	case request.URL.Path == "/":
		s.handleIndex(response, request)
	case request.URL.Path == "/generate":
		s.handleGenerate(response, request)
	case request.URL.Path == "/healthz":
		s.handleHealth(response, request)
	case strings.HasPrefix(request.URL.Path, "/static/"):
		s.handleStatic(response, request)
	default:
		http.NotFound(response, request)
	}
}

func (s *Server) handleIndex(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		s.renderError(response, http.StatusMethodNotAllowed, "Этот способ запроса не поддерживается.", FormState{})
		return
	}
	s.render(response, http.StatusOK, FormState{})
}

func (s *Server) handleHealth(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		response.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	response.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = io.WriteString(response, `{"status":"ok"}`)
}

func (s *Server) handleStatic(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		response.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	name := strings.TrimPrefix(request.URL.Path, "/static/")
	content, contentType, err := staticAsset(name)
	if err != nil {
		http.NotFound(response, request)
		return
	}
	response.Header().Set("Content-Type", contentType)
	response.Header().Set("Cache-Control", "no-cache")
	if request.Method == http.MethodGet {
		_, _ = response.Write(content)
	}
}

func staticAsset(name string) ([]byte, string, error) {
	switch name {
	case "app.js":
		content, err := assets.Assets.ReadFile(name)
		return content, "text/javascript; charset=utf-8", err
	case "styles.css":
		content, err := assets.Assets.ReadFile(name)
		return content, "text/css; charset=utf-8", err
	case "favicon.ico":
		content, err := mokaassets.StaticAssets.ReadFile(name)
		return content, "image/x-icon", err
	case "logo_lets_moka_v1.png":
		content, err := mokaassets.StaticAssets.ReadFile(name)
		return content, "image/png", err
	default:
		return nil, "", os.ErrNotExist
	}
}

func (s *Server) handleGenerate(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		s.renderError(response, http.StatusMethodNotAllowed, "Этот способ запроса не поддерживается.", FormState{})
		return
	}

	state := FormState{}
	request.Body = http.MaxBytesReader(response, request.Body, s.config.MaxBodyBytes)
	if err := request.ParseMultipartForm(2 * 1024 * 1024); err != nil {
		if request.MultipartForm != nil {
			_ = request.MultipartForm.RemoveAll()
		}
		var maxError *http.MaxBytesError
		if errors.As(err, &maxError) || strings.Contains(err.Error(), "request body too large") {
			s.renderError(response, http.StatusRequestEntityTooLarge, "Файл слишком большой. Размер загрузки не должен превышать 100 MiB.", state)
			return
		}
		s.renderError(response, http.StatusBadRequest, "Не удалось прочитать отправленную форму. Выберите файлы ещё раз.", state)
		return
	}
	defer request.MultipartForm.RemoveAll()
	state = stateFromRequest(request)

	mediaHeader, mediaFile, err := uploadFile(request, "media")
	if err != nil {
		s.renderError(response, http.StatusBadRequest, "Выберите медиафайл MP3, MP4 или OGG.", state)
		return
	}
	defer mediaFile.Close()
	state.MediaFilename = safeUploadName(mediaHeader.Filename)
	if mediaHeader.Size > maxMediaBytes {
		s.renderError(response, http.StatusRequestEntityTooLarge, "Медиафайл слишком большой. Максимальный размер — 100 MiB.", state)
		return
	}
	extension := strings.ToLower(path.Ext(state.MediaFilename))
	if !isSupportedExtension(extension) {
		s.renderError(response, http.StatusUnsupportedMediaType, "Поддерживаются только медиафайлы с расширением .mp3, .mp4 или .ogg.", state)
		return
	}

	assHeader, assFile, assErr := uploadFile(request, "ass")
	if assErr == nil {
		defer assFile.Close()
		state.ASSFilename = safeUploadName(assHeader.Filename)
	}

	mediaPath, err := temporaryMedia(mediaFile, extension)
	if err != nil {
		s.renderError(response, http.StatusUnprocessableEntity, "Не удалось подготовить медиафайл для проверки.", state)
		return
	}
	defer os.Remove(mediaPath)

	probeContext, cancel := context.WithTimeout(request.Context(), s.config.ProbeTimeout)
	metadata, err := media.Probe(probeContext, s.config.FFProbeExecutable, mediaPath)
	cancel()
	if err != nil {
		s.renderError(response, http.StatusUnprocessableEntity, "Не удалось прочитать метаданные медиафайла. Проверьте файл и наличие FFmpeg.", state)
		return
	}
	if !media.IsCompatibleFormat(extension, metadata.FormatName) {
		s.renderError(response, http.StatusUnprocessableEntity, "Расширение медиафайла не совпадает с его фактическим форматом.", state)
		return
	}
	applyMetadata(&state, metadata, state.MediaFilename)
	if assErr != nil {
		s.renderError(response, http.StatusBadRequest, "Выберите ASS-файл с текстом и таймингами.", state)
		return
	}

	dialogues, err := ass.Parse(assFile)
	if err != nil {
		s.renderError(response, http.StatusUnprocessableEntity, "Не удалось разобрать ASS-файл. Проверьте строки и тайминги.", state)
		return
	}
	for _, dialogue := range dialogues {
		if dialogue.EndMs > metadata.DurationMs {
			s.renderError(response, http.StatusUnprocessableEntity, "Тайминг ASS выходит за пределы длительности медиа.", state)
			return
		}
	}
	primaryText := state.PrimaryText
	if strings.TrimSpace(primaryText) == "" {
		lines := make([]string, 0, len(dialogues))
		for _, dialogue := range dialogues {
			lines = append(lines, dialogue.Text)
		}
		primaryText = strings.Join(lines, "\n")
	}
	state.PrimaryText = primaryText

	durationMs, err := strconv.ParseInt(strings.TrimSpace(state.DurationMs), 10, 64)
	if err != nil {
		s.renderError(response, http.StatusBadRequest, "Длительность должна быть положительным целым числом миллисекунд.", state)
		return
	}
	input := mock.Input{
		Title:          state.Title,
		FilePath:       state.FilePath,
		MediaKind:      state.MediaKind,
		DurationMs:     durationMs,
		Meaning:        meaningValue(state),
		Composers:      splitFormList(state.Composers),
		Artists:        splitFormList(state.Artists),
		PrimaryText:    primaryText,
		PrimaryTimings: timingsFor(dialogues),
		Secondary:      secondaryValue(state),
	}
	result, err := mock.Build(input)
	if err != nil {
		s.renderError(response, http.StatusBadRequest, friendlyValidationError(err), state)
		return
	}
	state.DurationMs = strconv.FormatInt(durationMs, 10)
	state.Result = string(result)
	state.DownloadName = downloadName(state.Title)
	state.HasResult = true
	s.render(response, http.StatusOK, state)
}

func uploadFile(request *http.Request, field string) (*multipart.FileHeader, multipart.File, error) {
	file, header, err := request.FormFile(field)
	if err != nil {
		return nil, nil, err
	}
	return header, file, nil
}

func temporaryMedia(source io.Reader, extension string) (string, error) {
	temporary, err := os.CreateTemp("", "lets-moka-media-*"+extension)
	if err != nil {
		return "", err
	}
	name := temporary.Name()
	removeOnError := true
	defer func() {
		if removeOnError {
			_ = os.Remove(name)
		}
	}()
	count, err := io.Copy(temporary, io.LimitReader(source, maxMediaBytes+1))
	closeErr := temporary.Close()
	if err != nil {
		return "", err
	}
	if closeErr != nil {
		return "", closeErr
	}
	if count > maxMediaBytes {
		return "", errors.New("media file exceeds size limit")
	}
	removeOnError = false
	return name, nil
}

func stateFromRequest(request *http.Request) FormState {
	return FormState{
		Title:             request.FormValue("title"),
		FilePath:          request.FormValue("filePath"),
		MediaKind:         request.FormValue("mediaKind"),
		DurationMs:        request.FormValue("durationMs"),
		Artists:           request.FormValue("artists"),
		Composers:         request.FormValue("composers"),
		Meaning:           request.FormValue("meaning"),
		MeaningNull:       request.FormValue("meaningNull") == "true",
		PrimaryText:       request.FormValue("primaryText"),
		SecondaryLanguage: request.FormValue("secondaryLanguage"),
		SecondaryText:     request.FormValue("secondaryText"),
	}
}

func applyMetadata(state *FormState, metadata media.Metadata, filename string) {
	baseName := strings.TrimSuffix(filename, path.Ext(filename))
	if strings.TrimSpace(state.Title) == "" {
		state.Title = metadata.Title
		if state.Title == "" {
			state.Title = baseName
		}
	}
	if strings.TrimSpace(state.MediaKind) == "" {
		state.MediaKind = metadata.MediaKind
	}
	if strings.TrimSpace(state.DurationMs) == "" {
		state.DurationMs = strconv.FormatInt(metadata.DurationMs, 10)
	}
	if strings.TrimSpace(state.Artists) == "" {
		state.Artists = strings.Join(metadata.Artists, ", ")
	}
	if strings.TrimSpace(state.Composers) == "" {
		state.Composers = strings.Join(metadata.Composers, ", ")
	}
	if strings.TrimSpace(state.Meaning) == "" && !state.MeaningNull {
		state.Meaning = metadata.Meaning
	}
	automaticPath := mock.BuildFilePath(baseName, filename)
	if strings.TrimSpace(state.FilePath) == "" || state.FilePath == automaticPath {
		subdirectory := state.Title
		if artists := splitFormList(state.Artists); len(artists) > 0 {
			subdirectory = artists[0]
		}
		state.FilePath = mock.BuildFilePath(subdirectory, filename)
	}
}

func timingsFor(dialogues []ass.Dialogue) []mock.Timing {
	timings := make([]mock.Timing, 0, len(dialogues))
	for index, dialogue := range dialogues {
		timings = append(timings, mock.Timing{LineIndex: index, StartTime: dialogue.StartMs, EndTime: dialogue.EndMs, Source: "import"})
	}
	return timings
}

func secondaryValue(state FormState) *mock.SecondaryLyric {
	language := strings.TrimSpace(state.SecondaryLanguage)
	text := state.SecondaryText
	if language == "" && strings.TrimSpace(text) == "" {
		return nil
	}
	return &mock.SecondaryLyric{Language: language, Text: text}
}

func meaningValue(state FormState) *string {
	if state.MeaningNull {
		return nil
	}
	value := state.Meaning
	return &value
}

func splitFormList(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		result = append(result, strings.TrimSpace(part))
	}
	return result
}

func isSupportedExtension(extension string) bool {
	return extension == ".mp3" || extension == ".mp4" || extension == ".ogg"
}

func safeUploadName(name string) string {
	name = strings.ReplaceAll(name, "\\", "/")
	return path.Base(name)
}

func downloadName(title string) string {
	var builder strings.Builder
	for _, character := range title {
		switch {
		case character == '/' || character == '\\' || character == ':' || character == '*' || character == '?' || character == '"' || character == '<' || character == '>' || character == '|':
			builder.WriteRune('-')
		case character < 0x20:
			builder.WriteRune('-')
		default:
			builder.WriteRune(character)
		}
	}
	cleaned := strings.Trim(builder.String(), " .")
	if cleaned == "" {
		cleaned = "moka"
	}
	return cleaned + ".json"
}

func friendlyValidationError(err error) string {
	message := err.Error()
	switch {
	case strings.Contains(message, "title"):
		return "Введите название мока."
	case strings.Contains(message, "filePath"):
		return "Путь должен быть относительным slash-путём с расширением .mp3, .mp4 или .ogg."
	case strings.Contains(message, "mediaKind"):
		return "Выберите тип медиа, соответствующий расширению файла."
	case strings.Contains(message, "durationMs"):
		return "Длительность должна быть положительным целым числом миллисекунд."
	case strings.Contains(message, "composers"):
		return "Добавьте хотя бы одного композитора и проверьте список."
	case strings.Contains(message, "artists"):
		return "Добавьте хотя бы одного исполнителя и проверьте список."
	case strings.Contains(message, "primary Japanese"):
		return "Добавьте основной текст на 日本語."
	case strings.Contains(message, "timing count"):
		return "Количество строк текста должно совпадать с количеством строк ASS."
	case strings.Contains(message, "timing values"):
		return "Проверьте: тайминги должны быть положительными и помещаться в длительность медиа."
	case strings.Contains(message, "timing source"):
		return "Источник таймингов не поддерживается."
	case strings.Contains(message, "meaning"):
		return "Заполните смысл или выберите NULL."
	case strings.Contains(message, "secondary language"):
		return "Для перевода выберите Русский или English."
	case strings.Contains(message, "secondary lyric"):
		return "Добавьте перевод целиком: число строк должно совпадать с 日本語."
	default:
		return "Проверьте обязательные поля и попробуйте ещё раз."
	}
}

func (s *Server) renderError(response http.ResponseWriter, status int, message string, state FormState) {
	state.Error = message
	state.StatusCode = status
	s.render(response, status, state)
}

func (s *Server) render(response http.ResponseWriter, status int, state FormState) {
	response.Header().Set("Content-Type", "text/html; charset=utf-8")
	response.WriteHeader(status)
	if err := s.template.Execute(response, state); err != nil {
		return
	}
}
