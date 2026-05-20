import { Injectable } from '@nestjs/common';
import { GuidanceReport, GuidanceReportInput } from './ai.types';
import { guidanceReportSchema } from './ai.schemas';
import { OpenRouterService } from './openrouter.service';

const SYSTEM_PROMPT = `You are a professional career development advisor providing constructive, actionable feedback to a candidate who did not pass a skills assessment.

Be encouraging but honest. Provide specific, real resources with URLs where possible. Return ONLY valid JSON — no markdown outside the JSON object.`;

@Injectable()
export class GuidanceReportService {
  constructor(private readonly openRouter: OpenRouterService) {}

  async generate(input: GuidanceReportInput): Promise<GuidanceReport> {
    const userPrompt = `
Track: ${input.track}
Claimed level: ${input.claimed_level}
Validated level: ${input.validated_level}
Score: ${input.percentage}% (pass threshold: 75%)
Strong competencies: ${input.strong_competencies.join(', ') || 'none identified'}
Areas needing improvement: ${input.weak_competencies.join(', ') || 'none identified'}

Generate a personalised guidance report with specific, actionable resources. Return JSON in this exact shape:
{
  "summary": "2-3 sentence overview of their performance",
  "strengths": ["strength 1", "strength 2"],
  "improvement_areas": ["specific area 1", "specific area 2", "specific area 3"],
  "recommended_resources": [
    {
      "title": "Resource title",
      "description": "Brief description of what they'll learn",
      "type": "video|article|course|documentation|tutorial|practice",
      "url": "https://... or null if generic advice",
      "is_free": true|false,
      "competencies": ["competency1", "competency2"],
      "estimated_minutes": 30 (or null)
    }
  ],
  "retake_advice": "one sentence on how to approach the retake in 14 days"
}

Rules:
- Never use the word "failed" or "downgraded"
- Frame everything around growth and next steps
- Be specific to the track and competencies provided
- Provide at least 4-6 resources, mix of free and paid
- Each resource must target specific weak competencies from the areas needing improvement
- Use real, relevant URLs when possible (YouTube, freeCodeCamp, Coursera, Udemy, official docs, etc.)
- Include a mix of resource types (videos, articles, courses, practice platforms)
- Prioritize free resources but include 1-2 quality paid options
- estimated_minutes should be realistic for the resource type
- retake_advice must mention the 14-day window`.trim();

    return this.openRouter.chat(
      SYSTEM_PROMPT,
      userPrompt,
      guidanceReportSchema,
      0.5,
    );
  }
}
