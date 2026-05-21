import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
} from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../../config/env';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly maxRetries = 3;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not configured; Gemini AI endpoints will be unavailable',
      );
    }

    this.client = new GoogleGenerativeAI(apiKey ?? '');
    this.model = this.client.getGenerativeModel({
      model: env.GEMINI_MODEL || 'gemini-3.5-flash',
    });
  }

  async chat<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>,
    temperature = 0.2,
  ): Promise<T> {
    if (!env.GEMINI_API_KEY) {
      throw new ServiceUnavailableException(
        'Gemini AI service is not configured',
      );
    }

    const generationConfig: GenerationConfig = {
      temperature,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig,
        });

        const response = result.response;
        const text = response.text();

        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        // Clean response - strip markdown code blocks if present
        let cleanedText = text.trim();

        // Remove ```json and ``` markers
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.slice(7); // Remove ```json
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.slice(3); // Remove ```
        }

        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.slice(0, -3); // Remove trailing ```
        }

        cleanedText = cleanedText.trim();

        // Parse and validate with Zod
        const parsed: unknown = JSON.parse(cleanedText);
        const validated = schema.parse(parsed);

        return validated;
      } catch (error: unknown) {
        lastError = error as Error;
        this.logger.warn(
          `Gemini call attempt ${attempt + 1}/${this.maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`,
        );

        if (attempt < this.maxRetries - 1) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    this.logger.error(
      `Gemini call failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`,
    );
    throw new ServiceUnavailableException('AI service temporarily unavailable');
  }
}
