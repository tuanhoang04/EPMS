package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;

import java.util.UUID;

@Getter
@Setter
public class QuestionRequest {
    private String questionText;
    private String questionAnswer;
    private String questionChoices;
    private String questionImageBase64;
    private Difficulty difficulty;
    private QuestionType questionType;
    private UUID topicId;
}
