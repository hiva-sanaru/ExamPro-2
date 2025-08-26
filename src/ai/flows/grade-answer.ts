
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
  prompt: `あなたはAI採点アシスタントです。提供された模範解答リストに基づいて、以下の受験者の解答リストを採点してください。

問題:
{{questionText}}

満点:
{{points}}

模範解答リスト (正解とみなされるべき解答):
{{#each modelAnswers}}
- {{this}}
{{/each}}

受験者の解答リスト:
{{#each answerTexts}}
- {{this}}
{{/each}}

採点ルール:
1. 受験者の各解答が、模範解答リストのいずれかの項目と内容的に一致するかを評価してください。
2. 解答の順序は問いません。受験者の解答が模範解答のいずれかと一致すれば、それは正解と見なされます。
3. 複数の受験者の解答が、同じ一つの模範解答に一致する場合、それらは一つの正解として扱います。
4. 最終的なスコアは、正解と判定されたユニークな模範解答の数に基づいて算出してください。例えば、満点が30点で模範解答が3つある場合、ユニークな正解1つにつき10点を与えます。
5. スコアと、そのスコアに至った根拠を日本語で提供してください。
6. スコアは0から満点の間の整数でなければなりません。
7. 根拠は、どの受験者の解答がどの模範解答に一致したか（あるいはしなかったか）を明確に説明する必要があります。`,
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
