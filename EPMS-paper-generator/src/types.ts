export interface QuestionChoice {
  value: string;
  isAnswer: boolean;
}

export type QuestionType =
  | 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE'
  | 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE'
  | 'TRUE_FALSE'
  | 'GAP_FILLING'
  | 'SHORT_ANSWER';

export interface QuestionData {
  id: string;
  questionText: string;
  questionType: QuestionType;
  questionChoices?: string | null;
  questionAnswer?: string | null;
  difficulty?: string;
  questionImageBase64?: string | null;
}

export interface PartData {
  title: string;
  questions: QuestionData[];
}

export interface GenerateRequest {
  title: string;
  subject: string;
  parts: PartData[];
}
