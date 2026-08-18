# ОТЧЁТ ОБ ИНЦИДЕНТАХ CI/CD

## INCIDENT: GITHUB ACTIONS `lets-uta` PIPELINE FAILED

### ВВОДНЫЕ ИНЦИДЕНТА

**Проект:** lets-uta
**Ошибка:** ci/cd
**Стадия:** Run quality gate

### ЛОГИ

```log
Run npm run gate

> gate
> npm run format:check && npm run lint && npm run check && npm run knip && npm run test

> format:check
> prettier --check .

Checking formatting...
[warn] lets-moka/README.md
[warn] lets-moka/TECH-TASK-LETS-MOKA.md
[warn] Code style issues found in 2 files. Run Prettier with --write to fix.
Error: Process completed with exit code 1.
```

## INCIDENT: GITHUB ACTIONS `lets-moka` PIPELINE FAILED

**Проект:** lets-moka
**Ошибка:** ci/cd
**Стадия:** Build standalone binary

### ЛОГИ

```log
Run go build -o lets-moka ./cmd/lets-moka
  go build -o lets-moka ./cmd/lets-moka
  shell: /usr/bin/bash -e {0}
stat /home/runner/work/lets-uta/lets-uta/lets-moka/cmd/lets-moka: directory not found
Error: Process completed with exit code 1.
```
