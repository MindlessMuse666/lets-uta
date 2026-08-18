(function () {
  'use strict';

  const allowedExtensions = new Set(['mp3', 'mp4', 'ogg', 'ass']);

  function setStatus(message) {
    document.querySelectorAll('[data-status]').forEach((node) => {
      node.textContent = message;
    });
  }

  function fileExtension(file) {
    return file.name.split('.').pop().toLowerCase();
  }

  function isAllowedFile(input, file) {
    const extension = fileExtension(file);
    const allowed =
      input.id === 'ass-file'
        ? extension === 'ass'
        : allowedExtensions.has(extension) && extension !== 'ass';
    if (!allowed) {
      setStatus(
        input.id === 'ass-file'
          ? 'Выберите файл с расширением .ass.'
          : 'Выберите медиафайл MP3, MP4 или OGG.'
      );
    }
    return allowed;
  }

  function updateFileLabel(input) {
    const file = input.files && input.files[0];
    const kind = input.id === 'ass-file' ? 'ass' : 'media';
    const label = document.querySelector(`[data-file-name="${kind}"]`);
    if (label && file) label.textContent = file.name;
  }

  function assignDroppedFile(input, file) {
    if (!isAllowedFile(input, file)) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function lineCount(value) {
    return value === '' ? 0 : value.replace(/\r\n?/g, '\n').split('\n').length;
  }

  function updateMeaningState(form) {
    const meaning = form.elements.namedItem('meaning');
    const nullToggle = form.elements.namedItem('meaningNull');
    if (meaning && nullToggle) meaning.readOnly = nullToggle.checked;
  }

  function updateTranslationState(form) {
    const language = form.elements.namedItem('secondaryLanguage');
    const translation = form.elements.namedItem('secondaryText');
    const primary = form.elements.namedItem('primaryText');
    const editor = form.querySelector('[data-lyrics-editor]');
    const lineCountNode = form.querySelector('[data-line-count]');
    const messageNode = form.querySelector('[data-sync-message]');
    if (!language || !translation || !primary || !editor || !lineCountNode || !messageNode) return;

    const selectedLanguage = language.value;
    const primaryLines = lineCount(primary.value);
    const secondaryLines = lineCount(translation.value);
    translation.disabled = selectedLanguage === '';
    translation.setAttribute('aria-disabled', String(translation.disabled));
    editor.classList.toggle('is-match', selectedLanguage !== '' && primaryLines === secondaryLines);
    editor.classList.toggle(
      'is-mismatch',
      selectedLanguage !== '' && primaryLines !== secondaryLines
    );
    lineCountNode.textContent = selectedLanguage
      ? `Строки: ${primaryLines} / ${secondaryLines}`
      : `Строки 日本語: ${primaryLines}`;
    messageNode.textContent = !selectedLanguage
      ? 'Выберите язык перевода или оставьте поле отключённым.'
      : primaryLines === secondaryLines
        ? "Let's Mock!"
        : 'Количество строк должно совпадать.';
  }

  function syncFormState(form, parsed) {
    parsed.querySelectorAll('[name]').forEach((next) => {
      if (next.type === 'file') return;
      const current = form.elements.namedItem(next.name);
      if (!current) return;
      if (next.type === 'checkbox') {
        current.checked = next.checked;
      } else if ('value' in next) {
        current.value = next.value;
      }
      if (next.hasAttribute('readonly')) current.setAttribute('readonly', '');
      else current.removeAttribute('readonly');
    });
    updateMeaningState(form);
    updateTranslationState(form);
    form.querySelectorAll('[data-autogrow]').forEach(autoGrow);
  }

  function syncErrorBlock(form, parsed) {
    const current = document.querySelector('.error-block');
    const next = parsed.querySelector('.error-block');
    if (current && next) current.replaceWith(next);
    else if (!current && next) form.before(next);
  }

  async function refreshMetadata(form, mediaInput) {
    const metadataForm = new FormData(form);
    metadataForm.delete('ass');
    form.setAttribute('aria-busy', 'true');
    setStatus('Читаем длительность и метаданные медиафайла…');
    try {
      const response = await fetch(form.action, { method: 'POST', body: metadataForm });
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      syncFormState(form, parsed);
      setStatus(
        response.ok || response.status === 400
          ? 'Метаданные медиафайла заполнены. Теперь выберите ASS.'
          : 'Не удалось прочитать метаданные медиафайла.'
      );
      updateFileLabel(mediaInput);
    } catch {
      setStatus('Не удалось прочитать метаданные медиафайла. Проверьте локальный сервер.');
    } finally {
      form.removeAttribute('aria-busy');
    }
  }

  async function submitForm(event, form) {
    event.preventDefault();
    form.setAttribute('aria-busy', 'true');
    setStatus('Собираем JSON-мок…');
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      if (response.ok && parsed.querySelector('[data-result-json]')) {
        document.documentElement.replaceWith(parsed.documentElement);
        init();
        return;
      }
      syncFormState(form, parsed);
      syncErrorBlock(form, parsed);
      setStatus('Проверьте сообщение об ошибке и исправьте форму. Выбранные файлы сохранены.');
    } catch {
      setStatus('Не удалось отправить форму. Проверьте локальный сервер.');
    } finally {
      form.removeAttribute('aria-busy');
    }
  }

  function bindDropZone(input) {
    const card = input.closest('.file-card');
    if (!card) return;
    ['dragenter', 'dragover'].forEach((eventName) => {
      card.addEventListener(eventName, (event) => {
        event.preventDefault();
        card.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      card.addEventListener(eventName, (event) => {
        event.preventDefault();
        card.classList.remove('is-dragover');
      });
    });
    card.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files[0];
      if (file) assignDroppedFile(input, file);
    });
  }

  function bindForm(form) {
    const mediaInput = form.querySelector('#media-file');
    const assInput = form.querySelector('#ass-file');
    const meaningNull = form.elements.namedItem('meaningNull');
    const language = form.elements.namedItem('secondaryLanguage');

    [mediaInput, assInput].forEach((input) => {
      if (!input) return;
      bindDropZone(input);
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file || !isAllowedFile(input, file)) return;
        updateFileLabel(input);
        if (input === mediaInput) {
          setStatus('Медиафайл выбран. Читаем метаданные…');
          await refreshMetadata(form, mediaInput);
        } else {
          setStatus('ASS-файл выбран. Тайминги будут проверены при сборке.');
        }
      });
    });

    form.addEventListener('submit', (event) => submitForm(event, form));
    meaningNull?.addEventListener('change', () => {
      updateMeaningState(form);
      setStatus(
        meaningNull.checked
          ? 'Смысл будет записан как NULL.'
          : 'Смысл снова включён для редактирования.'
      );
    });
    language?.addEventListener('change', () => updateTranslationState(form));
    form.querySelectorAll('[data-autogrow]').forEach((textarea) => {
      textarea.addEventListener('input', () => {
        autoGrow(textarea);
        updateTranslationState(form);
      });
      autoGrow(textarea);
    });
    updateMeaningState(form);
    updateTranslationState(form);
  }

  function bindResultActions() {
    const result = document.querySelector('[data-result-json]');
    const copyButton = document.querySelector('[data-copy]');
    if (result && copyButton) {
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.textContent || '');
          setStatus('JSON скопирован в буфер обмена.');
        } catch {
          setStatus(
            'Не удалось скопировать автоматически. Выделите JSON и скопируйте его вручную.'
          );
        }
      });
    }

    const downloadButton = document.querySelector('[data-download]');
    if (result && downloadButton) {
      downloadButton.addEventListener('click', () => {
        const blob = new Blob([result.textContent || ''], {
          type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadButton.getAttribute('data-download-name') || 'moka.json';
        link.click();
        URL.revokeObjectURL(url);
        setStatus(`Файл ${link.download} подготовлен для скачивания.`);
      });
    }
  }

  function init() {
    const form = document.querySelector('.workbench');
    if (form) bindForm(form);
    bindResultActions();
  }

  init();
})();
