(function () {
  'use strict';

  const mediaInput = document.querySelector('#media-file');
  const mediaKind = document.querySelector('select[name="mediaKind"]');
  const titleInput = document.querySelector('input[name="title"]');
  const filePathInput = document.querySelector('input[name="filePath"]');
  const meaningInput = document.querySelector('#meaning');
  const meaningNull = document.querySelector('#meaning-null');

  function setStatus(message) {
    document.querySelectorAll('[data-status]').forEach((node) => {
      node.textContent = message;
    });
  }

  if (mediaInput) {
    mediaInput.addEventListener('change', async () => {
      const file = mediaInput.files && mediaInput.files[0];
      if (!file) return;
      const extension = file.name.split('.').pop().toLowerCase();
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const kind = extension === 'mp4' ? 'video' : 'audio';
      if (mediaKind) mediaKind.value = kind;
      if (titleInput && !titleInput.value.trim()) titleInput.value = baseName;
      if (filePathInput && !filePathInput.value.trim()) {
        filePathInput.value = `media/fixtures/${baseName || 'untitled'}/${file.name}`;
      }
      const label = document.querySelector('[data-file-name="media"]');
      if (label) label.textContent = file.name;
      setStatus('Медиафайл выбран. Проверьте остальные поля перед сборкой.');

      const form = mediaInput.closest('form');
      if (!form) return;
      const metadataForm = new FormData(form);
      metadataForm.delete('ass');
      form.setAttribute('aria-busy', 'true');
      setStatus('Читаем длительность и метаданные медиафайла…');
      try {
        const response = await fetch(form.action, { method: 'POST', body: metadataForm });
        const markup = await response.text();
        const parsed = new DOMParser().parseFromString(markup, 'text/html');
        ['title', 'filePath', 'mediaKind', 'durationMs', 'artists', 'composers', 'meaning'].forEach((name) => {
          const current = form.elements.namedItem(name);
          const next = parsed.querySelector(`[name="${name}"]`);
          if (current && next && 'value' in next) current.value = next.value;
        });
        setStatus(response.ok || response.status === 400 ? 'Метаданные медиафайла заполнены. Теперь выберите ASS.' : 'Не удалось прочитать метаданные медиафайла.');
      } catch (_error) {
        setStatus('Не удалось прочитать метаданные медиафайла. Проверьте локальный сервер.');
      } finally {
        form.removeAttribute('aria-busy');
      }
    });
  }

  const assInput = document.querySelector('#ass-file');
  if (assInput) {
    assInput.addEventListener('change', () => {
      const file = assInput.files && assInput.files[0];
      if (!file) return;
      const label = document.querySelector('[data-file-name="ass"]');
      if (label) label.textContent = file.name;
      setStatus('ASS-файл выбран. Тайминги будут проверены при сборке.');
    });
  }

  if (meaningNull && meaningInput) {
    meaningNull.addEventListener('change', () => {
      meaningInput.readOnly = meaningNull.checked;
      setStatus(meaningNull.checked ? 'Смысл будет записан как NULL.' : 'Смысл снова включён для редактирования.');
    });
  }

  const result = document.querySelector('[data-result-json]');
  const copyButton = document.querySelector('[data-copy]');
  if (result && copyButton) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(result.textContent || '');
        setStatus('JSON скопирован в буфер обмена.');
      } catch (_error) {
        setStatus('Не удалось скопировать автоматически. Выделите JSON и скопируйте его вручную.');
      }
    });
  }

  const downloadButton = document.querySelector('[data-download]');
  if (result && downloadButton) {
    downloadButton.addEventListener('click', () => {
      const blob = new Blob([result.textContent || ''], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadButton.getAttribute('data-download-name') || 'moka.json';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Файл ${link.download} подготовлен для скачивания.`);
    });
  }
})();
