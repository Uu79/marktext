# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

MarkText is a next-generation markdown editor built with Electron, Vue.js, and a custom editing engine called Muya. It provides WYSIWYG (What You See Is What You Get) markdown editing with support for CommonMark, GitHub Flavored Markdown, and Pandoc markdown extensions.

## Key Commands

### Development
```bash
# Install dependencies (requires Node.js >=v16 but <v17)
yarn install --frozen-lockfile

# Run in development mode
yarn run dev

# Build the application
yarn run build

# Build binary only (without packaging)
yarn run build:bin

# Lint code
yarn run lint

# Auto-fix linting issues
yarn run lint:fix

# Run unit tests
yarn run unit

# Run end-to-end tests
yarn run e2e

# Run all tests
yarn run test

# Run specification tests (CommonMark and GFM compliance)
yarn run test:specs
```

### Platform-specific builds
```bash
# Build for Linux
yarn run release:linux

# Build for macOS
yarn run release:mac

# Build for Windows
yarn run release:win
```

## Architecture

### Three-Layer Architecture

1. **Muya** (`src/muya/`): The core markdown editing engine
   - Pure JavaScript implementation using DOM/BOM APIs only
   - No Electron or Node.js dependencies
   - Handles markdown parsing, block-based document structure, and WYSIWYG rendering
   - Located in `src/muya/lib/`

2. **Main Process** (`src/main/`):
   - Entry point: `src/main/index.js`
   - Manages application lifecycle, windows, menus, and native OS integration
   - Handles file I/O, preferences, and IPC communication
   - Key components:
     - `app/`: Application management and window manager
     - `windows/`: Window classes (editor, settings)
     - `menu/`: Application menu system
     - `preferences/`: User preferences management
     - `filesystem/`: File operations and watching

3. **Renderer Process** (`src/renderer/`):
   - Entry point: `src/renderer/main.js`
   - Vue.js-based UI layer
   - Hosts Muya and CodeMirror (for source code mode)
   - Key components:
     - `components/`: Vue components for UI
     - `store/`: Vuex state management
     - `pages/`: Main application pages
     - `prefComponents/`: Preference panel components

### Key Design Patterns

- **Block-based Document Model**: Documents are represented as a tree of blocks (paragraphs, headings, code blocks, etc.)
- **Virtual DOM Rendering**: Uses Snabbdom for efficient DOM updates in Muya
- **IPC Communication**: Main and renderer processes communicate via Electron IPC for file operations and system integration
- **State Management**: Uses Vuex for managing application state in the renderer process

## Important Files and Directories

- `src/muya/lib/contentState/`: Core document state management
- `src/muya/lib/parser/`: Markdown parsing and rendering logic
- `src/main/windows/editor.js`: Main editor window management
- `src/renderer/store/editor.js`: Editor state management
- `src/renderer/components/editorWithTabs/`: Tab-based editor UI
- `.electron-vue/`: Build configuration and webpack configs
- `electron-builder.yml`: Electron Builder packaging configuration

## Code Style

- ES6+ JavaScript with Babel transpilation
- 2 spaces indentation
- No semicolons (enforced by ESLint)
- Vue single-file components for UI
- JSDoc for documentation

## Development Workflow

1. All PRs should target the `develop` branch
2. Run `yarn run lint` before committing
3. Ensure tests pass with `yarn run test`
4. For UI changes, test in development mode with `yarn run dev`
5. Test builds on target platforms before release

## Testing Approach

- Unit tests: Located in `test/unit/` using Karma and Mocha
- E2E tests: Located in `test/e2e/` using Playwright
- Specification tests: CommonMark and GFM compliance tests in `test/specs/`

## Key Dependencies

- **Electron**: Cross-platform desktop framework
- **Vue.js 2**: UI framework (with Vuex for state management)
- **CodeMirror**: Source code editing mode
- **Snabbdom**: Virtual DOM library used in Muya
- **KaTeX**: Math expression rendering
- **Mermaid**: Diagram and flowchart rendering
- **PrismJS**: Syntax highlighting
- **DOMPurify**: XSS protection for HTML content