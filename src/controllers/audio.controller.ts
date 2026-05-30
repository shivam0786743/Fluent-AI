import { type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.middleware.js';

// Helper to strip base64 prefix if present
const cleanBase64 = (base64Str: string): string => {
  if (base64Str.includes(';base64,')) {
    return base64Str.split(';base64,')[1];
  }
  return base64Str;
};

// Helper for Deepgram Speech-to-Text
const transcribeAudio = async (
  audioBase64: string,
  apiKey: string,
  modelName: string = 'nova-2'
): Promise<{ transcript: string; confidence: number; words: any[] }> => {
  const cleanData = cleanBase64(audioBase64);
  const audioBuffer = Buffer.from(cleanData, 'base64');

  const url = `https://api.deepgram.com/v1/listen?model=${modelName}&smart_format=true`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram API returned ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const transcript =
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  const confidence =
    data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];

  return { transcript, confidence, words };
};

// Helper for Murf AI Text-to-Speech
const generateSpeech = async (
  text: string,
  apiKey: string,
  voiceId: string = 'en-US-natalie',
  format: string = 'MP3',
  encodeAsBase64: boolean = true
): Promise<{ audioFile: string; audioLengthInSeconds: number; encodedAudio?: string }> => {
  const url = 'https://api.murf.ai/v1/speech/generate';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
      format,
      modelVersion: 'GEN2',
      encodeAsBase64,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Murf AI API returned ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  return {
    audioFile: data.audioFile || '',
    audioLengthInSeconds: data.audioLengthInSeconds || 0,
    encodedAudio: data.encodedAudio,
  };
};

// Helper for Gemini AI LLM
const generateGeminiText = async (
  prompt: string,
  apiKey: string,
  systemInstruction?: string
): Promise<string> => {
  const envModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const modelPath = envModel.startsWith('models/') ? envModel : `models/${envModel}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: systemInstruction
        ? {
            parts: [{ text: systemInstruction }],
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Gemini API did not return text response.');
  }

  return responseText;
};

// POST /api/audio/text-to-speech
export const textToSpeech = async (req: AuthRequest, res: Response) => {
  try {
    const { text, voiceId, format, encodeAsBase64 } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text parameter is required and must be a string' });
    }

    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'MURF_API_KEY is not configured on the server' });
    }

    const result = await generateSpeech(
      text,
      apiKey,
      voiceId,
      format,
      encodeAsBase64 !== undefined ? encodeAsBase64 : true
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Text-to-Speech synthesis failed', error: error.message });
  }
};

// POST /api/audio/speech-to-text
export const speechToText = async (req: AuthRequest, res: Response) => {
  try {
    const { audio, model } = req.body;
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ message: 'audio (base64 string) is required' });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'DEEPGRAM_API_KEY is not configured on the server' });
    }

    const result = await transcribeAudio(audio, apiKey, model);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Speech-to-Text transcription failed', error: error.message });
  }
};

// POST /api/audio/voice-to-voice
export const voiceToVoice = async (req: AuthRequest, res: Response) => {
  try {
    const { audio, voiceId, systemInstruction } = req.body;
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ message: 'audio (base64 string) is required' });
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const murfKey = process.env.MURF_API_KEY;

    if (!deepgramKey || !geminiKey || !murfKey) {
      return res.status(500).json({
        message: 'Required API keys (DEEPGRAM_API_KEY, GEMINI_API_KEY, MURF_API_KEY) are not fully configured on the server',
      });
    }

    // Step 1: Transcribe user speech using Deepgram
    const transcriptionResult = await transcribeAudio(audio, deepgramKey);
    const userTranscript = transcriptionResult.transcript;

    if (!userTranscript || userTranscript.trim() === '') {
      return res.status(400).json({
        message: 'No speech could be detected in the provided audio file.',
      });
    }

    // Step 2: Get Gemini response text
    const defaultSysInstruction = 'You are a helpful language learning assistant on Fluent-Ai.';
    const aiResponseText = await generateGeminiText(
      userTranscript,
      geminiKey,
      systemInstruction || defaultSysInstruction
    );

    // Step 3: Convert Gemini response text to speech using Murf AI
    const speechResult = await generateSpeech(
      aiResponseText,
      murfKey,
      voiceId,
      'MP3',
      true
    );

    res.status(200).json({
      userTranscript,
      aiResponseText,
      aiResponseAudio: speechResult.encodedAudio || speechResult.audioFile,
      audioLengthInSeconds: speechResult.audioLengthInSeconds,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Voice-to-Voice conversational pipeline failed', error: error.message });
  }
};
