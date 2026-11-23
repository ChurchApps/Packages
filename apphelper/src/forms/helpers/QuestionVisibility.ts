import { AnswerInterface, QuestionInterface } from "@churchapps/helpers";

export class QuestionVisibility {
  // A condition on a question that no longer exists is ignored rather than hiding the question for good.
  static isVisible(question: QuestionInterface, questions: QuestionInterface[], getAnswer: (questionId: string) => AnswerInterface | null) {
    const condition = question.showIf;
    if (!condition?.questionId) return true;
    const trigger = questions.find((q) => q.id === condition.questionId);
    if (!trigger) return true;
    const value = getAnswer(trigger.id || "")?.value || "";
    if (!condition.value) return value !== "";
    if (trigger.fieldType === "Checkbox") return value.split(",").includes(condition.value);
    return value === condition.value;
  }

  static visibleQuestions(questions: QuestionInterface[], getAnswer: (questionId: string) => AnswerInterface | null) {
    return questions.filter((q) => QuestionVisibility.isVisible(q, questions, getAnswer));
  }
}
