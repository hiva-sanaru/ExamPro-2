
'use server';
/**
 * @fileOverview AI-powered automatic grading tool.
 *
 * - gradeAnswer - A function that handles the grading of examinee answers based on a rubric.
 * - GradeAnswerInput - The input type for the gradeAnswer function.
 * - GradeAnswerOutput - The return type for the gradeAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeAnswerInputSchema = z.object({
  questionText: z.string().describe('The text of the exam question.'),
  modelAnswers: z.array(z.string()).describe('A list of model answers for the exam question.'),
  gradingCriteria: z.string().optional().describe('The criteria for grading the answer.'),
  answerTexts: z.array(z.string()).describe('A list of the examinee answers.'),
  points: z.number().describe('The maximum points for the question.'),
});
export type GradeAnswerInput = z.infer<typeof GradeAnswerInputSchema>;

const GradeAnswerOutputSchema = z.object({
  score: z.number().describe('The score assigned to the answer based on the rubric.'),
  justification: z
    .string()
    .describe('The justification for the assigned score based on the rubric.'),
});
export type GradeAnswerOutput = z.infer<typeof GradeAnswerOutputSchema>;

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeAnswerOutput> {
  return gradeAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeAnswerPrompt',
  input: {schema: GradeAnswerInputSchema},
  output: {schema: GradeAnswerOutputSchema},
  prompt: `あなたはAI採点アシスタントです。提供された採点基準と模範解答リストに基づいて、以下の受験者の解答リストを採点してください。

問題:
{{questionText}}

満点:
{{points}}

採点基準 (最も重視すべき評価項目):
{{gradingCriteria}}

模範解答リスト (正解の参考例):
{{#each modelAnswers}}
- {{this}}
{{/each}}

受験者の解答リスト:
{{#each answerTexts}}
- {{this}}
{{/each}}

採点ルール:
1. 採点基準を最優先の評価軸としてください。受験者の解答が採点基準で示された要点を満たしているかを判断します。
2. 模範解答は、採点基準を適用する上での参考として利用します。解答の表現が模範解答と完全に一致していなくても、採点基準を満たしていれば加点対象となります。
3. 受験者の各解答が、採点基準に照らしてどの程度達成できているかを評価してください。
4. 解答の順序は問いません。
5. 複数の受験者の解答が、同じ一つの評価項目に一致する場合、それらは一つの正解として扱います。
6. 最終的なスコアは、採点基準の達成度と、それに伴う模範解答との一致度を総合的に判断して算出してください。
7. スコアと、そのスコアに至った根拠を日本語で提供してください。
8. スコアは0から満点の間の整数でなければなりません。
9. 根拠は、どの受験者の解答がどの採点基準や模範解答に一致したか（あるいはしなかったか）を明確に説明する必要があります。`,
});

const gradeAnswerFlow = ai.defineFlow(
  {
    name: 'gradeAnswerFlow',
    inputSchema: GradeAnswerInputSchema,
    outputSchema: GradeAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
