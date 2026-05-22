import {
  buildQrCodeUrl,
  buildShareUrl,
  categorizeCompetencies,
  formatSlugLabel,
  readPersonalAnswers,
  readSessionQuestions,
  resolveGoalLabel,
  resolveKeyStrengths,
  resolveRoleLabel,
  resolveSeniorityBadge,
  resolveSkills,
  resolveTierLabel,
  rubricScorePercentage,
} from './verified-profile.utils';

describe('verified-profile.utils', () => {
  describe('formatSlugLabel', () => {
    it('formats slug labels for display', () => {
      expect(formatSlugLabel('frontend_developer')).toBe('Frontend Developer');
      expect(formatSlugLabel('')).toBe('');
      expect(formatSlugLabel('single')).toBe('Single');
      expect(formatSlugLabel('already Formatted')).toBe('Already Formatted');
    });
  });

  describe('readPersonalAnswers', () => {
    it('strips _meta key from answers', () => {
      const result = readPersonalAnswers({
        tools: ['react'],
        specialization: 'frontend',
        _meta: { version: 1 },
      });
      expect(result).toEqual({ tools: ['react'], specialization: 'frontend' });
      expect('_meta' in result).toBe(false);
    });

    it('returns empty object for null', () => {
      expect(readPersonalAnswers(null)).toEqual({});
    });

    it('returns empty object for non-object types', () => {
      expect(readPersonalAnswers('string' as never)).toEqual({});
      expect(readPersonalAnswers(123 as never)).toEqual({});
      expect(readPersonalAnswers([])).toEqual({});
    });
  });

  describe('resolveSkills', () => {
    it('collects tools and other skill entries', () => {
      expect(
        resolveSkills({
          tools: ['react', 'node'],
          tools_other: 'GraphQL',
        }),
      ).toEqual(['react', 'node', 'GraphQL']);
    });

    it('filters out empty strings from tools', () => {
      expect(
        resolveSkills({
          tools: ['react', '', '  '],
        }),
      ).toEqual(['react']);
    });

    it('returns undefined when no tools found', () => {
      expect(resolveSkills({})).toBeUndefined();
      expect(resolveSkills({ tools: [] })).toBeUndefined();
      expect(resolveSkills(null)).toBeUndefined();
      expect(resolveSkills(undefined)).toBeUndefined();
    });

    it('ignores non-string entries in tools array', () => {
      expect(
        resolveSkills({
          tools: ['react', 123, null, 'node'],
        }),
      ).toEqual(['react', 'node']);
    });
  });

  describe('resolveRoleLabel', () => {
    it('prioritizes specialization from personal answers', () => {
      expect(
        resolveRoleLabel('backend_developer', null, null, {
          specialization: 'frontend_engineer',
        }),
      ).toBe('Frontend Engineer');
    });

    it('uses poolProfile specialization over personal answers', () => {
      expect(
        resolveRoleLabel('backend_developer', null, 'api_engineering', {
          specialization: 'frontend_engineer',
        }),
      ).toBe('Api Engineering');
    });

    it('falls back to profileTrack', () => {
      expect(
        resolveRoleLabel('data_analyst', null, null, {}),
      ).toBe('Data Analyst');
    });

    it('falls back to profileRoleTrack', () => {
      expect(
        resolveRoleLabel(null, 'product_designer', null, {}),
      ).toBe('Product Designer');
    });

    it('returns Talent as last resort', () => {
      expect(resolveRoleLabel(null, null, null, {})).toBe('Talent');
    });
  });

  describe('resolveGoalLabel', () => {
    it('formats goal slug', () => {
      expect(resolveGoalLabel('land_first_role')).toBe('Land First Role');
    });

    it('returns empty string for null or empty', () => {
      expect(resolveGoalLabel(null)).toBe('');
      expect(resolveGoalLabel('')).toBe('');
    });
  });

  describe('readSessionQuestions', () => {
    it('returns questions array from generated_questions_json', () => {
      const json = {
        questions: [
          { question_id: 'q1', block: 'short_text' },
          { question_id: 'q2', block: 'long_text' },
        ],
      };
      expect(readSessionQuestions(json)).toHaveLength(2);
    });

    it('returns empty array for null', () => {
      expect(readSessionQuestions(null)).toEqual([]);
    });

    it('returns empty array for malformed data', () => {
      expect(readSessionQuestions({})).toEqual([]);
      expect(readSessionQuestions({ questions: 'not-array' })).toEqual([]);
      expect(readSessionQuestions({ questions: null })).toEqual([]);
      expect(readSessionQuestions([])).toEqual([]);
      expect(readSessionQuestions('string' as never)).toEqual([]);
    });
  });

  describe('rubricScorePercentage', () => {
    it('computes standard rubric scores', () => {
      expect(rubricScorePercentage({ total: 9 }, false)).toBe(75);
      expect(rubricScorePercentage({ total: 4 }, true)).toBe(67);
    });

    it('handles edge-case totals', () => {
      for (const isLt3 of [false, true] as const) {
        expect(rubricScorePercentage({ total: NaN }, isLt3)).toBeNull();
        expect(rubricScorePercentage({ total: Infinity }, isLt3)).toBeNull();
        expect(rubricScorePercentage({ total: undefined }, isLt3)).toBeNull();
        expect(rubricScorePercentage({ total: 'a' }, isLt3)).toBeNull();
        expect(rubricScorePercentage({ total: null }, isLt3)).toBeNull();

        expect(rubricScorePercentage({ total: -1 }, isLt3)).toBe(0);
        expect(rubricScorePercentage({ total: 0 }, isLt3)).toBe(0);
        expect(rubricScorePercentage({ total: 99 }, isLt3)).toBe(100);
      }
    });

    it('returns null for null evaluation', () => {
      expect(rubricScorePercentage(null, false)).toBeNull();
      expect(rubricScorePercentage(null, true)).toBeNull();
    });
  });

  describe('resolveSeniorityBadge', () => {
    it('returns correct label for each verified level', () => {
      expect(resolveSeniorityBadge('entry')).toBe('Entry Level');
      expect(resolveSeniorityBadge('junior')).toBe('Junior Level');
      expect(resolveSeniorityBadge('mid')).toBe('Mid Level');
      expect(resolveSeniorityBadge('senior')).toBe('Senior Level');
      expect(resolveSeniorityBadge('expert')).toBe('Expert Level');
    });

    it('returns formatted label for unknown level', () => {
      expect(resolveSeniorityBadge('principal')).toBe('Principal');
    });

    it('returns undefined for null or undefined', () => {
      expect(resolveSeniorityBadge(null)).toBeUndefined();
      expect(resolveSeniorityBadge(undefined)).toBeUndefined();
    });
  });

  describe('resolveTierLabel', () => {
    it('returns correct display labels', () => {
      expect(resolveTierLabel('job_ready')).toBe('Job Ready');
      expect(resolveTierLabel('emerging')).toBe('Emerging');
      expect(resolveTierLabel('not_ready')).toBe('Not Ready');
    });

    it('returns formatted label for unknown tier', () => {
      expect(resolveTierLabel('unknown_tier')).toBe('Unknown Tier');
    });

    it('returns undefined for null or undefined', () => {
      expect(resolveTierLabel(null)).toBeUndefined();
      expect(resolveTierLabel(undefined)).toBeUndefined();
    });
  });

  describe('resolveKeyStrengths', () => {
    const scores = {
      technical_reasoning: 92,
      communication: 78,
      leadership: 65,
    };

    it('returns sorted strengths matching strong competencies', () => {
      const result = resolveKeyStrengths(scores, [
        'technical_reasoning',
        'leadership',
      ]);
      expect(result).toHaveLength(2);
      expect(result![0].competency).toBe('technical_reasoning');
      expect(result![0].percentage).toBe(92);
      expect(result![1].competency).toBe('leadership');
      expect(result![1].percentage).toBe(65);
    });

    it('is case-insensitive when matching competencies', () => {
      const result = resolveKeyStrengths(scores, ['Technical_Reasoning']);
      expect(result).toHaveLength(1);
      expect(result![0].competency).toBe('technical_reasoning');
    });

    it('returns undefined when competencyScores is null', () => {
      expect(resolveKeyStrengths(null, ['test'])).toBeUndefined();
    });

    it('returns undefined when strongCompetencies is empty', () => {
      expect(resolveKeyStrengths(scores, [])).toBeUndefined();
    });

    it('returns undefined when strongCompetencies is null', () => {
      expect(resolveKeyStrengths(scores, null)).toBeUndefined();
    });

    it('returns undefined when no competencies match', () => {
      expect(
        resolveKeyStrengths(scores, ['nonexistent_competency']),
      ).toBeUndefined();
    });
  });

  describe('categorizeCompetencies', () => {
    it('splits professional and soft competencies', () => {
      const scores = {
        technical_reasoning: 92,
        communication: 78,
        leadership: 85,
        problem_solving: 88,
      };

      const result = categorizeCompetencies(scores);
      expect(result.professionalSkills).toBeDefined();
      expect(result.softSkills).toBeDefined();

      const profLabels = result.professionalSkills!.map((s) => s.label);
      expect(profLabels).toContain('Technical Reasoning');
      expect(profLabels).toContain('Problem Solving');

      const softLabels = result.softSkills!.map((s) => s.label);
      expect(softLabels).toContain('Communication');
      expect(softLabels).toContain('Leadership');
    });

    it('puts unknown competencies in professional by default', () => {
      const result = categorizeCompetencies({
        some_unknown_skill: 75,
      });
      expect(result.professionalSkills).toHaveLength(1);
      expect(result.professionalSkills![0].label).toBe('Some Unknown Skill');
      expect(result.softSkills).toBeUndefined();
    });

    it('returns undefined for both when scores is null', () => {
      const result = categorizeCompetencies(null);
      expect(result.professionalSkills).toBeUndefined();
      expect(result.softSkills).toBeUndefined();
    });

    it('sorts by percentage descending', () => {
      const result = categorizeCompetencies({
        technical_reasoning: 80,
        problem_solving: 95,
      });
      expect(result.professionalSkills![0].percentage).toBe(95);
      expect(result.professionalSkills![1].percentage).toBe(80);
    });
  });

  describe('buildShareUrl', () => {
    it('constructs correct share URL', () => {
      expect(buildShareUrl('https://skillbridge.com', 'abc123')).toBe(
        'https://skillbridge.com/verified-profiles/abc123',
      );
    });

    it('strips trailing slashes from base URL', () => {
      expect(buildShareUrl('https://skillbridge.com/', 'abc123')).toBe(
        'https://skillbridge.com/verified-profiles/abc123',
      );
    });

    it('returns empty string when token is missing', () => {
      expect(buildShareUrl('https://skillbridge.com', null)).toBe('');
      expect(buildShareUrl('https://skillbridge.com', undefined)).toBe('');
    });
  });

  describe('buildQrCodeUrl', () => {
    it('constructs QR code URL with encoded data', () => {
      const url = buildQrCodeUrl('https://skillbridge.com/abc');
      expect(url).toContain('api.qrserver.com');
      expect(url).toContain(encodeURIComponent('https://skillbridge.com/abc'));
      expect(url).toContain('size=200x200');
    });

    it('returns undefined for empty input', () => {
      expect(buildQrCodeUrl('')).toBeUndefined();
    });
  });

  // ─── Additional regression and boundary tests ────────────────────────────────

  describe('formatSlugLabel – extra edge cases', () => {
    it('handles consecutive underscores gracefully', () => {
      // consecutive underscores produce an empty part that filter(Boolean) removes
      expect(formatSlugLabel('a__b')).toBe('A B');
    });

    it('handles leading and trailing underscores', () => {
      expect(formatSlugLabel('_frontend_')).toBe('Frontend');
    });
  });

  describe('readPersonalAnswers – extra edge cases', () => {
    it('returns empty object when store contains only _meta key', () => {
      const result = readPersonalAnswers({ _meta: { version: 2 } });
      expect(result).toEqual({});
    });

    it('preserves all non-_meta keys as-is', () => {
      const result = readPersonalAnswers({
        tools: ['react'],
        _meta: { v: 1 },
        extra: 'value',
      });
      expect(result).toEqual({ tools: ['react'], extra: 'value' });
    });
  });

  describe('resolveSkills – extra edge cases', () => {
    it('trims whitespace from valid tool strings', () => {
      expect(
        resolveSkills({ tools: ['  react  ', ' node '] }),
      ).toEqual(['react', 'node']);
    });

    it('returns undefined when tools_other is empty or whitespace only', () => {
      expect(resolveSkills({ tools_other: '' })).toBeUndefined();
      expect(resolveSkills({ tools_other: '   ' })).toBeUndefined();
    });

    it('includes trimmed tools_other when present', () => {
      expect(
        resolveSkills({ tools_other: '  GraphQL  ' }),
      ).toEqual(['GraphQL']);
    });

    it('returns undefined when tools is not an array', () => {
      expect(resolveSkills({ tools: 'react' })).toBeUndefined();
      expect(resolveSkills({ tools: 42 })).toBeUndefined();
    });
  });

  describe('resolveRoleLabel – extra edge cases', () => {
    it('ignores non-string answers.specialization', () => {
      expect(
        resolveRoleLabel('data_analyst', null, null, {
          specialization: 42,
        }),
      ).toBe('Data Analyst');
    });

    it('prefers profileTrack over profileRoleTrack', () => {
      expect(
        resolveRoleLabel('frontend_developer', 'backend_developer', null, {}),
      ).toBe('Frontend Developer');
    });
  });

  describe('resolveKeyStrengths – extra edge cases', () => {
    it('formats competency labels correctly', () => {
      const result = resolveKeyStrengths(
        { technical_reasoning: 85 },
        ['technical_reasoning'],
      );
      expect(result![0].label).toBe('Technical Reasoning');
    });

    it('sorts by percentage descending when multiple match', () => {
      const scores = { a_skill: 60, b_skill: 90, c_skill: 75 };
      const result = resolveKeyStrengths(scores, ['a_skill', 'b_skill', 'c_skill']);
      expect(result![0].percentage).toBeGreaterThanOrEqual(result![1].percentage);
      expect(result![1].percentage).toBeGreaterThanOrEqual(result![2].percentage);
    });

    it('returns undefined when competencyScores is undefined', () => {
      expect(resolveKeyStrengths(undefined, ['test'])).toBeUndefined();
    });

    it('returns undefined when strongCompetencies is undefined', () => {
      expect(
        resolveKeyStrengths({ technical_reasoning: 90 }, undefined),
      ).toBeUndefined();
    });
  });

  describe('categorizeCompetencies – extra edge cases', () => {
    it('returns undefined for both when scores is an empty object', () => {
      const result = categorizeCompetencies({});
      expect(result.professionalSkills).toBeUndefined();
      expect(result.softSkills).toBeUndefined();
    });

    it('returns only softSkills when all competencies are soft', () => {
      const result = categorizeCompetencies({
        communication: 80,
        leadership: 75,
        teamwork: 90,
      });
      expect(result.professionalSkills).toBeUndefined();
      expect(result.softSkills).toBeDefined();
      expect(result.softSkills!.map((s) => s.label)).toContain('Communication');
    });

    it('returns only professionalSkills when all competencies are professional', () => {
      const result = categorizeCompetencies({
        technical_reasoning: 88,
        problem_solving: 92,
      });
      expect(result.softSkills).toBeUndefined();
      expect(result.professionalSkills).toBeDefined();
    });

    it('preserves correct percentage values after categorization', () => {
      const result = categorizeCompetencies({ communication: 77 });
      expect(result.softSkills![0].percentage).toBe(77);
    });

    it('returns undefined for both when scores is undefined', () => {
      const result = categorizeCompetencies(undefined);
      expect(result.professionalSkills).toBeUndefined();
      expect(result.softSkills).toBeUndefined();
    });
  });

  describe('buildShareUrl – extra edge cases', () => {
    it('handles multiple trailing slashes', () => {
      expect(buildShareUrl('https://skillbridge.com///', 'abc123')).toBe(
        'https://skillbridge.com/verified-profiles/abc123',
      );
    });

    it('returns empty string for empty token string', () => {
      expect(buildShareUrl('https://skillbridge.com', '')).toBe('');
    });
  });

  describe('buildQrCodeUrl – extra edge cases', () => {
    it('produces a well-formed URL for a token containing special characters', () => {
      const shareUrl = 'https://example.com/verified-profiles/a+b=c&d';
      const result = buildQrCodeUrl(shareUrl);
      expect(result).toBe(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
      );
    });
  });

  describe('resolveSeniorityBadge – extra edge cases', () => {
    it('returns formatted label for multi-word unknown level', () => {
      expect(resolveSeniorityBadge('staff_engineer')).toBe('Staff Engineer');
    });

    it('returns undefined for empty string', () => {
      // empty string is falsy
      expect(resolveSeniorityBadge('')).toBeUndefined();
    });
  });

  describe('resolveTierLabel – extra edge cases', () => {
    it('returns undefined for empty string', () => {
      expect(resolveTierLabel('')).toBeUndefined();
    });
  });
});
