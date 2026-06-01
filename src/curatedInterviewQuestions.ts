import {
  generatedInterviewQuestions,
  type GeneratedInterviewQuestion,
} from "./generatedProjectData";

export type CuratedInterviewQuestion = GeneratedInterviewQuestion;

export const curatedInterviewQuestions = generatedInterviewQuestions;
export const curatedInterviewQuestionCount = curatedInterviewQuestions.length;
