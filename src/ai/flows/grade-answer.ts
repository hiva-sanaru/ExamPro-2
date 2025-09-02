
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

const SubQuestionSchema = z.object({
    text: z.string().describe('The text of the sub-question.'),
    points: z.number().describe('The points for the sub-question.'),
    modelAnswers: z.array(z.string()).describe('A list of model answers for the sub-question.'),
    gradingCriteria: z.string().optional().describe('The grading criteria for the sub-question.'),
    answerTexts: z.array(z.string()).describe('A list of the examinee answers for the sub-question.'),
});

const GradeAnswerInputSchema = z.object({
  questionText: z.string().describe('The text of the main exam question.'),
  modelAnswers: z.array(z.string()).describe('A list of model answers for the main exam question.'),
  gradingCriteria: z.string().optional().describe('The criteria for grading the answer.'),
  answerTexts: z.array(z.string()).describe('A list of the examinee answers for the main question.'),
  points: z.number().describe('The maximum points for the question (including sub-questions).'),
  subQuestions: z.array(SubQuestionSchema).optional().describe('An array of sub-questions, if any.'),
});
export type GradeAnswerInput = z.infer<typeof GradeAnswerInputSchema>;

const GradeAnswerOutputSchema = z.object({
  score: z.number().describe('The total score assigned to the answer, summing up scores from main and sub-questions if applicable, based on the rubric.'),
  justification: z
    .string()
    .describe('The justification for the assigned score based on the rubric. If there are sub-questions, provide a summary justification followed by justification for each sub-question.'),
});
export type GradeAnswerOutput = z.infer<typeof GradeAnswerOutputSchema>;

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeAnswerOutput> {
  return gradeAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeAnswerPrompt',
  input: {schema: GradeAnswerInputSchema},
  output: {schema: GradeAnswerOutputSchema},
  prompt: `あなたはAI採点アシスタントです。提供された採点基準と模範解答リストに基づいて、以下の受験者の解答を採点してください。

全体の満点: {{points}}

---
**親問題**
問題文: {{questionText}}
{{#if gradingCriteria}}採点基準 (最重要): {{gradingCriteria}}{{/if}}
{{#if modelAnswers}}
模範解答リスト:
{{#each modelAnswers}}
- {{this}}
{{/each}}
{{/if}}
{{#if answerTexts}}
受験者の解答リスト:
{{#each answerTexts}}
- {{this}}
{{/each}}
{{/if}}
---

{{#if subQuestions}}
**サブ問題**
{{#each subQuestions}}
---
サブ問題 {{@index}}:
問題文: {{this.text}}
満点: {{this.points}}
{{#if this.gradingCriteria}}採点基準: {{this.gradingCriteria}}{{/if}}
模範解答リスト:
{{#each this.modelAnswers}}
- {{this}}
{{/each}}
受験者の解答リスト:
{{#each this.answerTexts}}
- {{this}}
{{/each}}
---
{{/each}}
{{/if}}

採点ルール:
1.  まず、問題の構造（親問題とサブ問題）を理解してください。
2.  採点基準を最優先の評価軸とします。受験者の解答が採点基準で示された要点を満たしているかを判断します。
3.  模範解答は、採点基準を適用する上での参考として利用します。解答の表現が模範解答と完全に一致していなくても、採点基準を満たしていれば加点対象となります。
4.  **サブ問題がある場合**:
    a. まず親問題の文脈を理解した上で、各サブ問題を個別に採点してください。
    b. 各サブ問題のスコアは、そのサブ問題の満点を超えることはできません。
    c. 最終的なスコアは、すべてのサブ問題のスコアの合計となります。親問題自体には配点はありません。
5.  **サブ問題がない場合**:
    a. 親問題の解答を直接採点してください。
6.  解答の順序は問いません。複数の解答が同じ評価項目に一致する場合、それは一つの正解として扱います。
7.  最終的な合計スコアと、そのスコアに至った根拠を日本語で提供してください。
8.  根拠には、どの解答がどの採点基準や模範解答に一致したか（あるいはしなかったか）を明確に説明する必要があります。サブ問題がある場合は、まず総評を述べ、その後で各サブ問題の採点根拠を明確に分けて記述してください。
9.  合計スコアは0から全体の満点の間の整数でなければなりません。`,
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
