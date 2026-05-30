import '../setup';
import { Response } from 'express';
import * as audioController from '../../src/controllers/audio.controller';
import { AuthRequest } from '../../src/middleware/auth.middleware';

describe('Audio Controller', () => {
  let mockRes: Partial<Response>;
  let originalFetch: any;
  let mockFetch: jest.Mock;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;

    // Reset env keys before each test
    process.env.MURF_API_KEY = 'mock_murf_key';
    process.env.DEEPGRAM_API_KEY = 'mock_deepgram_key';
    process.env.GEMINI_API_KEY = 'mock_gemini_key';
  });

  describe('textToSpeech', () => {
    it('should return 400 if text is missing', async () => {
      const mockReq = {
        body: {},
      } as unknown as AuthRequest;

      await audioController.textToSpeech(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'text parameter is required and must be a string',
      });
    });

    it('should return 500 if MURF_API_KEY is missing', async () => {
      delete process.env.MURF_API_KEY;
      const mockReq = {
        body: { text: 'Hello' },
      } as unknown as AuthRequest;

      await audioController.textToSpeech(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'MURF_API_KEY is not configured on the server',
      });
    });

    it('should synthesize text to speech successfully', async () => {
      const mockReq = {
        body: { text: 'Hello World', voiceId: 'voice-1', encodeAsBase64: true },
      } as unknown as AuthRequest;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audioFile: 'http://example.com/audio.mp3',
          audioLengthInSeconds: 1.5,
          encodedAudio: 'base64audiobytes',
        }),
      });

      await audioController.textToSpeech(mockReq, mockRes as Response);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions]: [any, any] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://api.murf.ai/v1/speech/generate');
      expect(calledOptions.headers['api-key']).toBe('mock_murf_key');
      expect(JSON.parse(calledOptions.body)).toEqual({
        text: 'Hello World',
        voiceId: 'voice-1',
        format: 'MP3',
        modelVersion: 'GEN2',
        encodeAsBase64: true,
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        audioFile: 'http://example.com/audio.mp3',
        audioLengthInSeconds: 1.5,
        encodedAudio: 'base64audiobytes',
      });
    });
  });

  describe('speechToText', () => {
    it('should return 400 if audio is missing', async () => {
      const mockReq = {
        body: {},
      } as unknown as AuthRequest;

      await audioController.speechToText(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'audio (base64 string) is required',
      });
    });

    it('should return 500 if DEEPGRAM_API_KEY is missing', async () => {
      delete process.env.DEEPGRAM_API_KEY;
      const mockReq = {
        body: { audio: 'base64bytes' },
      } as unknown as AuthRequest;

      await audioController.speechToText(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'DEEPGRAM_API_KEY is not configured on the server',
      });
    });

    it('should transcribe speech to text successfully', async () => {
      const mockReq = {
        body: { audio: 'data:audio/wav;base64,base64bytes', model: 'nova-2' },
      } as unknown as AuthRequest;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: 'testing transcription',
                    confidence: 0.98,
                    words: [{ word: 'testing', start: 0, end: 1 }],
                  },
                ],
              },
            ],
          },
        }),
      });

      await audioController.speechToText(mockReq, mockRes as Response);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions]: [any, any] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('https://api.deepgram.com/v1/listen');
      expect(calledUrl).toContain('model=nova-2');
      expect(calledOptions.headers.Authorization).toBe('Token mock_deepgram_key');
      expect(calledOptions.body).toBeInstanceOf(Buffer);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        transcript: 'testing transcription',
        confidence: 0.98,
        words: [{ word: 'testing', start: 0, end: 1 }],
      });
    });
  });

  describe('voiceToVoice', () => {
    it('should return 400 if audio is missing', async () => {
      const mockReq = {
        body: {},
      } as unknown as AuthRequest;

      await audioController.voiceToVoice(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'audio (base64 string) is required',
      });
    });

    it('should return 500 if any key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const mockReq = {
        body: { audio: 'base64bytes' },
      } as unknown as AuthRequest;

      await audioController.voiceToVoice(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('are not fully configured'),
        })
      );
    });

    it('should return 400 if transcribed user speech is empty', async () => {
      const mockReq = {
        body: { audio: 'base64bytes' },
      } as unknown as AuthRequest;

      // Mock Deepgram response with empty transcript
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: {
            channels: [
              {
                alternatives: [{ transcript: '', confidence: 0 }],
              },
            ],
          },
        }),
      });

      await audioController.voiceToVoice(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No speech could be detected in the provided audio file.',
      });
    });

    it('should orchestrate V2V pipeline successfully', async () => {
      const mockReq = {
        body: { audio: 'base64bytes', voiceId: 'voice-2', systemInstruction: 'custom sys prompt' },
      } as unknown as AuthRequest;

      // 1. Deepgram mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: {
            channels: [
              {
                alternatives: [{ transcript: 'Hello assistant', confidence: 0.95 }],
              },
            ],
          },
        }),
      });

      // 2. Gemini mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hello, how can I help you learn today?' }],
              },
            },
          ],
        }),
      });

      // 3. Murf AI mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audioFile: 'http://example.com/response.mp3',
          audioLengthInSeconds: 3.2,
          encodedAudio: 'base64responseaudio',
        }),
      });

      await audioController.voiceToVoice(mockReq, mockRes as Response);

      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify Deepgram call
      const [dgUrl, dgOptions] = mockFetch.mock.calls[0];
      expect(dgUrl).toContain('api.deepgram.com');
      expect(dgOptions.headers.Authorization).toBe('Token mock_deepgram_key');

      // Verify Gemini call
      const [geminiUrl, geminiOptions] = mockFetch.mock.calls[1];
      expect(geminiUrl).toContain('generativelanguage.googleapis.com');
      expect(geminiOptions.headers['x-goog-api-key']).toBe('mock_gemini_key');
      expect(JSON.parse(geminiOptions.body)).toEqual({
        contents: [
          {
            parts: [{ text: 'Hello assistant' }],
          },
        ],
        systemInstruction: {
          parts: [{ text: 'custom sys prompt' }],
        },
      });

      // Verify Murf AI call
      const [murfUrl, murfOptions] = mockFetch.mock.calls[2];
      expect(murfUrl).toContain('api.murf.ai');
      expect(murfOptions.headers['api-key']).toBe('mock_murf_key');
      expect(JSON.parse(murfOptions.body)).toEqual({
        text: 'Hello, how can I help you learn today?',
        voiceId: 'voice-2',
        format: 'MP3',
        modelVersion: 'GEN2',
        encodeAsBase64: true,
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        userTranscript: 'Hello assistant',
        aiResponseText: 'Hello, how can I help you learn today?',
        aiResponseAudio: 'base64responseaudio',
        audioLengthInSeconds: 3.2,
      });
    });
  });
});
