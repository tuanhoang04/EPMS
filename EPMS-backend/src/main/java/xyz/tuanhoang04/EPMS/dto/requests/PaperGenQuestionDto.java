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
}
