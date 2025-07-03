#!/usr/bin/env node

const fs = require('fs');
const axios = require('axios');
const clipboardy = require('clipboardy');
const { spawn } = require('child_process');
const FormData = require('form-data');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config({ path: '.env.local' });

const argv = yargs(hideBin(process.argv))
  .option('lang', {
    alias: 'l',
    type: 'string',
    description: 'Input language (e.g., es, en, pt)',
    default: 'es',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output file for the English prompt',
  })
  .option('clipboard', {
    alias: 'c',
    type: 'boolean',
    description: 'Copy result to clipboard',
    default: true,
  })
  .option('prompt', {
    alias: 'p',
    type: 'string',
    description: 'Override the system prompt for translation',
  })
  .help()
  .argv;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const defaultSystemPrompt = `
You are a programming expert and an AI assistant for developers. You will receive instructions in Spanish on what I want Cursor IDE to do. Your task is to convert those instructions into a clear, concise, and effective prompt in English, optimized for the Cursor language model. Think about how you would give an instruction to an AI to generate or modify code.
Example:
Instrucción en español: "Crea una función en Python para sumar dos números."
Prompt en inglés (tú lo generarías): "Create a Python function to sum two numbers."
Another example:
Instrucción en español: "Refactoriza esta sección del código para mejorar la legibilidad y usar buenas prácticas."
Prompt en inglés (tú lo generarías): "Refactor this code section to improve readability and apply best practices."
`;

function recordAudio(filename) {
  return new Promise((resolve, reject) => {
    const sox = spawn('sox', [
      '-t', 'waveaudio',
      '-d',
      filename
    ]);

    sox.stderr.on('data', (data) => {
      console.error(`sox stderr: ${data}`);
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    console.log('�� Recording... Press ESC to finish.');

    function onKeyPress(key) {
      if (key === '\u001b') { // ESC key
        sox.kill('SIGINT');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onKeyPress);
      }
    }

    process.stdin.on('data', onKeyPress);

    sox.on('close', (code) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onKeyPress);
      if (code !== 0 && code !== null) {
        reject(new Error(`sox process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function transcribeAudio(filename, lang) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filename));
  formData.append('model', 'whisper-1');
  formData.append('language', lang);

  const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.text;
}

async function translateToPrompt(spanishText, systemPrompt) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: spanishText },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.choices[0].message.content.trim();
}

function stripOuterQuotes(text) {
  return text.replace(/^"(.*)"$/, '$1');
}

(async () => {
  if (!OPENAI_API_KEY) {
    console.error('⚠️  Error: OPENAI_API_KEY not set. Please set it in .env.local or your environment.');
    process.exit(1);
  }

  const audioFile = 'audio.wav';
  await recordAudio(audioFile);
  console.log('📝 Transcribing...');
  const inputText = await transcribeAudio(audioFile, argv.lang);
  console.log('🇪🇸🌍 Input:', inputText);

  const systemPrompt = argv.prompt || defaultSystemPrompt;
  console.log('🔄 Translating to English prompt...');
  const englishPrompt = await translateToPrompt(inputText, systemPrompt);
  const cleanPrompt = stripOuterQuotes(englishPrompt);
  console.log('🇬🇧🌍 English prompt:', cleanPrompt);

  if (argv.clipboard) {
    clipboardy.writeSync(cleanPrompt);
    console.log('📋 Prompt copied to clipboard!');
  }
  if (argv.output) {
    fs.writeFileSync(argv.output, cleanPrompt, 'utf8');
    console.log(`💾 Prompt written to ${argv.output}`);
  }
})();