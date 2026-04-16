package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PaperGenQuestionDto {
    private String id;
    private String questionText;
    private String questionType;
    private String questionChoices;
    private String questionAnswer;
    private String difficulty;
    private int answerLines;
    private String questionImageBase64;  // populated when calling the paper generator; null in stored history
    private String questionImagePath;    // relative file path stored in history JSON; null when calling the generator
}
