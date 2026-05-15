import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env';
import {
  AiReportGeneratedBy,
  AiReportPayload,
  AiReportTier,
  WeakArea,
  Strength,
} from './entities/ai-report.entity';

export interface GenerationContext {
  userId: string;
  score: number;
  tier: AiReportTier;
  track?: string;
  specialisation?: string;
  validatedLevel?: string;
}

export interface GenerationResult {
  payload: AiReportPayload;
  generatedBy: AiReportGeneratedBy;
}

const emergingPayloadSchema = z.object({
  summary: z.string().min(1),
  weakAreas: z
    .array(
      z.object({
        area: z.string().min(1),
        insight: z.string().min(1),
        resources: z.array(
          z.object({ title: z.string().min(1), link: z.string().min(1) }),
        ),
      }),
    )
    .min(1),
});

const jobReadyPayloadSchema = z.object({
  summary: z.string().min(1),
  strengths: z
    .array(
      z.object({
        area: z.string().min(1),
        insight: z.string().min(1),
      }),
    )
    .min(1),
});

@Injectable()
export class AiReportGenerationService {
  private readonly logger = new Logger(AiReportGenerationService.name);
  private readonly openai: OpenAI | null;

  constructor() {
    this.openai = env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
      : null;

    if (!this.openai) {
      this.logger.warn(
        'OPENAI_API_KEY not set — AI report generation will use template fallback',
      );
    }
  }

  async generate(ctx: GenerationContext): Promise<GenerationResult> {
    if (!this.openai) {
      return { payload: this.buildTemplate(ctx), generatedBy: AiReportGeneratedBy.TEMPLATE };
    }

    try {
      const payload = await this.callLlm(ctx);
      return { payload, generatedBy: AiReportGeneratedBy.AI };
    } catch (err) {
      this.logger.error(
        `LLM generation failed for user ${ctx.userId}; falling back to template`,
        err instanceof Error ? err.stack : err,
      );
      return { payload: this.buildTemplate(ctx), generatedBy: AiReportGeneratedBy.TEMPLATE };
    }
  }

  private async callLlm(ctx: GenerationContext): Promise<AiReportPayload> {
    const isEmerging = ctx.tier === AiReportTier.EMERGING;
    const track = ctx.track ?? 'software development';
    const specialisation = ctx.specialisation ?? track;
    const level = ctx.validatedLevel ?? 'junior';

    const systemPrompt = isEmerging
      ? `You generate professional, supportive assessment feedback reports for a tech talent platform.
Tone rules (mandatory):
- Supportive and growth-focused. Never judgmental. Never imply dishonesty or laziness.
- Do not say "you failed", "you lied", or "you were wrong". Use "there is room to grow" or "this area needs more practice".
- Keep the summary to 2–3 sentences maximum.
Output strict JSON only. No markdown, no code fences, no extra keys.`
      : `You generate professional strengths-focused assessment feedback reports for a tech talent platform.
Tone rules (mandatory):
- Celebratory, encouraging, and growth-focused.
- Keep the summary to 2–3 sentences maximum.
Output strict JSON only. No markdown, no code fences, no extra keys.`;

    const userPrompt = isEmerging
      ? `Candidate context:
- Track: ${track}
- Specialisation: ${specialisation}
- Validated level: ${level}
- Score: ${ctx.score}/100 (Emerging — below 75)

Generate a guidance report in this exact JSON shape:
{
  "summary": "<2–3 sentence overview>",
  "weakAreas": [
    {
      "area": "<topic name>",
      "insight": "<specific, constructive observation>",
      "resources": [
        { "title": "<resource title>", "link": "https://example.com" }
      ]
    }
  ]
}
Produce 2–3 weak areas. Each resource link must be a real, plausible URL for the given track.`
      : `Candidate context:
- Track: ${track}
- Specialisation: ${specialisation}
- Validated level: ${level}
- Score: ${ctx.score}/100 (Job Ready — 75 and above)

Generate a strengths report in this exact JSON shape:
{
  "summary": "<2–3 sentence overview>",
  "strengths": [
    {
      "area": "<topic name>",
      "insight": "<specific, positive observation>"
    }
  ]
}
Produce 2–3 strengths.`;

    const response = await this.openai!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty LLM response');

    const parsed: unknown = JSON.parse(raw);
    const schema = isEmerging ? emergingPayloadSchema : jobReadyPayloadSchema;
    const result = schema.safeParse(parsed);

    if (!result.success) {
      this.logger.error('LLM response failed schema validation', result.error.flatten());
      throw new Error('LLM response schema mismatch');
    }

    return result.data;
  }

  private buildTemplate(ctx: GenerationContext): AiReportPayload {
    const track = ctx.specialisation ?? ctx.track ?? 'your track';
    const isEmerging = ctx.tier === AiReportTier.EMERGING;

    if (isEmerging) {
      const weakAreas: WeakArea[] = [
        {
          area: 'Core Fundamentals',
          insight: `There is room to strengthen your foundational knowledge in ${track}. Revisiting core concepts will improve your score significantly.`,
          resources: [
            {
              title: `${track} Fundamentals — MDN Web Docs`,
              link: 'https://developer.mozilla.org',
            },
          ],
        },
        {
          area: 'Problem Solving',
          insight: 'Practising structured problem solving with timed exercises will help you perform better under assessment conditions.',
          resources: [
            { title: 'LeetCode Practice Problems', link: 'https://leetcode.com' },
          ],
        },
      ];
      return {
        summary: `You completed the assessment with a score of ${ctx.score}/100. There are clear areas where focused practice will help you reach Job Ready status. Your retake will be available in 14 days.`,
        weakAreas,
      };
    }

    const strengths: Strength[] = [
      {
        area: `${track} Proficiency`,
        insight: `You demonstrated solid command of ${track} concepts throughout the assessment.`,
      },
      {
        area: 'Technical Communication',
        insight: 'Your answers showed a clear, structured approach to problem solving.',
      },
    ];
    return {
      summary: `Congratulations — you scored ${ctx.score}/100 and have achieved Job Ready status. Your verified profile is now live and visible to employers on the platform.`,
      strengths,
    };
  }
}
