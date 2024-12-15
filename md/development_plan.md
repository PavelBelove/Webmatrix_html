# WebMatrix Development Plan

## Project Overview

WebMatrix - универсальный инструмент для анализа данных с помощью LLM, реализованный как single-page application. Основной принцип - максимальная гибкость через промпты при минимуме кода. Максимальная независимость и портативность.

## Технический стек

### Выбор инструментов

После анализа современных инструментов сборки (Webpack, Vite, Rollup, Parcel) выбран **Webpack** по следующим причинам:

- Надёжность и проверенность решений
- Богатая экосистема плагинов
- Гибкая настройка бандла
- Хорошая поддержка монофайла
- Готовые решения для обфускации
- Перспектива расширения Chrome
- Большое сообщество и документация

### Структура проекта

```
src/
├── core/                 # Ядро приложения
│   ├── api.js           # Работа с API
│   ├── storage.js       # Локальное хранилище
│   ├── table.js         # Обработка таблиц
│   └── prompt.js        # Работа с промптами
├── ui/                  # Интерфейс
│   ├── components/      # Переиспользуемые компоненты
│   ├── styles/          # CSS модули
│   └── templates/       # HTML шаблоны
├── features/           # Функциональные модули
│   ├── chat/           # Функционал чата
│   ├── presets/        # Работа с пресетами
│   └── easter-eggs/    # Пасхалки
├── prompts/            # Промпты и текстовые данные
│   ├── community/      # Промпты community версии
│   │   ├── system/     # Системные промпты
│   │   ├── templates/  # Шаблоны анализа
│   │   └── examples/   # Примеры использования
│   └── enterprise/     # Промпты enterprise версии
│       ├── system/     # Специализированные промпты
│       ├── templates/  # Бизнес-шаблоны
│       └── custom/     # Кастомные решения
├── versions/          # Версии приложения
│   ├── community/     # Файлы community версии
│   └── enterprise/    # Файлы enterprise версии
└── config/           # Конфигурация сборки
    ├── webpack.common.js
    ├── webpack.community.js
    └── webpack.enterprise.js
```

## Версионирование

### Community Version

- MIT лицензия
- Базовый функционал анализа
- Общие промпты для типовых задач
- Социальные элементы (ссылки, шеринг)
- Пасхалки для виральности
- Мотивация к sharing & contribution

### Enterprise Version

- Внутренняя лицензия
- Специализированные промпты
- Интеграция с внутренними системами
- Кастомные шаблоны анализа
- Корпоративный брендинг
- Упрощенный интерфейс

## Особенности реализации

### Сборка

- Единый HTML файл на выходе
- Встроенные ресурсы (base64)
- Минификация и обфускация
- Шифрование чувствительных данных
- Условная компиляция для версий

### Безопасность

- Обфускация промптов и пасхалок
- Защита API ключей
- Локальное хранение данных
- Валидация входных данных

### Расширяемость

- Модульная структура
- Готовность к Chrome Extension
- Возможность добавления новых форматов
- Простое обновление промптов

## План развития

### Этап 1: Модуляризация

- [x] Выбор инструментов сборки
- [ ] Разделение монолита на модули
- [ ] Настройка Webpack
- [ ] Базовая сборка

### Этап 2: Версионирование

- [ ] Разделение промптов
- [ ] Настройка условной компиляции
- [ ] Тестирование версий
- [ ] Документация различий

### Этап 3: Оптимизация

- [ ] Обфускация и шифрование
- [ ] Оптимизация бандла
- [ ] Тестирование производительности
- [ ] Улучшение UX

### Этап 4: Расширение

- [ ] Библиотека промптов
- [ ] Социальные функции
- [ ] Chrome Extension
- [ ] Система обновлений

## Принципы разработки

1. Сохранение простоты конечного продукта
2. Удобство разработки и поддержки
3. Безопасность чувствительных данных
4. Гибкость настройки и расширения
5. Оптимизация размера и производительности

## Метрики качества

- Размер финального файла < 200KB
- Время загрузки < 2s
- Совместимость с современными браузерами
- Успешная обфускация промптов
- Корректная работа обеих версий

## Дополнительно

- Система автоматических тестов
- Линтинг и форматирование
- Документация для разработчиков
- Гайды по contribution

# План модуляризации WebMatrix

## 1. Дублирующийся функционал

### 1.1 Обработка API запросов

- Функция `makeRequest` дублируется в:
  - src/core/api.js
  - WebMatrix_v_0.1.html
- Нужно оставить только в core/api.js и добавить:
  - Обработку ошибок
  - Очередь запросов
  - Валидацию ответов

### 1.2 Работа с таблицей

- Функции работы с таблицей разбросаны:
  - initTableWithData (WebMatrix + src/core/table.js)
  - updateTableColumns (WebMatrix + src/ui/components/Table.js)
  - formatCellContent (WebMatrix + utils)
- Объединить в src/core/table.js и src/ui/components/Table.js

### 1.3 Чат

- Дублирование логики чата:
  - updateChatUI (WebMatrix + src/agents/chat/messages.js)
  - formatMessage (WebMatrix + utils)
  - sendMessage (WebMatrix + src/agents/chat/messages.js)
- Перенести в agents/chat

## 2. Функционал для переноса

### 2.1 Из WebMatrix в core/

- handleFileUpload -> core/files.js
- processFileContent -> core/files.js
- parseCSV -> utils/parsers.js
- cleanUrl -> utils/url.js
- extractJsonFromResponse -> core/api.js

### 2.2 Из WebMatrix в agents/analyzer/

- processUrls -> analyzer/processor.js
- startProcessing -> analyzer/index.js
- stopProcessing -> analyzer/index.js
- updateStatus -> analyzer/ui.js
- highlightProcessingRow -> analyzer/ui.js

### 2.3 Из WebMatrix в agents/promptMaster/

- generatePrompt -> promptMaster/index.js
- generatePromptForUrl -> promptMaster/prompts.js

### 2.4 Из WebMatrix в features/presets/

- Весь функционал пресетов:
  - updatePresetList
  - loadPreset
  - savePreset
  - deletePreset
  - importPresets
  - exportPresets

## 3. Улучшения функционала

### 3.1 API и запросы

- Добавить очередь запросов
- Реализовать retry механизм
- Улучшить валидацию ответов
- Добавить тайм-ауты

### 3.2 Работа с данными

- Добавить виртуализацию таблицы
- Реализовать сортировку
- Добавить фильтрацию
- Улучшить форматирование ячеек

### 3.3 Чат

- Добавить поддержку файлов
- Улучшить форматирование markdown
- Добавить code highlighting
- Реализовать drag-n-drop

### 3.4 Пресеты

- Добавить категории
- Реализовать поиск
- Добавить описания
- Улучшить импорт/экспорт

## 4. Стили и UI

### 4.1 Вынести стили

- Создать структуру:
  ```
  src/ui/styles/
  ├── components/
  │   ├── table.css
  │   ├── chat.css
  │   ├── buttons.css
  │   └── forms.css
  ├── layout/
  │   ├── grid.css
  │   └── containers.css
  └── themes/
      ├── light.css
      └── dark.css
  ```

### 4.2 Компоненты

- Разделить на независимые компоненты:
  - Table
  - Chat
  - Settings
  - Presets
  - FileUpload
  - ProgressBar

## 5. Сборка

### 5.1 Webpack

- Создать конфигурации:
  ```
  config/
  ├── webpack.common.js
  ├── webpack.dev.js
  ├── webpack.prod.js
  └── webpack.enterprise.js
  ```

### 5.2 Оптимизация

- Настроить:
  - Минификацию
  - Tree shaking
  - Code splitting
  - Lazy loading

## 6. Приоритеты работ

1. Перенос API функционала
2. Модуляризация таблицы
3. Перенос чата
4. Вынос стилей
5. Настройка сборки
6. Улучшения функционала
