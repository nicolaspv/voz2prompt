# voz2prompt

A CLI tool to record your voice (in Spanish or any language), transcribe it, and generate a clear English prompt for use with AI coding assistants like Cursor IDE.

## Features
- Record audio from your microphone (press ESC to stop)
- Transcribe using OpenAI Whisper
- Translate/code-prompt using OpenAI GPT-4
- Output to clipboard, file, or terminal
- Configurable via CLI options

## Installation

### Local (in your project)
```
yarn install
# or
npm install
```

### Global (recommended)
```
yarn global add .
# or
npm install -g .
```

## Usage

```
voz2prompt [options]
```

### Options
- `-l, --lang <code>`        Input language (default: es)
- `-o, --output <file>`      Output file for the English prompt
- `-c, --clipboard`          Copy result to clipboard (default: true, use --no-clipboard to disable)
- `-p, --prompt <prompt>`    Override the system prompt for translation
- `--help`                   Show help

### Example Commands

```
# Basic usage (records, translates, copies to clipboard)
voz2prompt

# Specify input language and output file
voz2prompt --lang es --output prompt.txt

# Disable clipboard copy
voz2prompt --no-clipboard

# Override the system prompt
voz2prompt --prompt "You are a helpful assistant for code translation."
```

## .env.local Example

Create a `.env.local` file in your project root with your OpenAI API key:

```
OPENAI_API_KEY=sk-...your-openai-key...
```

## Requirements
- Node.js 18+
- SoX (Sound eXchange) installed and in your PATH
- OpenAI API key in `.env.local` as `OPENAI_API_KEY=sk-...`

## License
MIT 