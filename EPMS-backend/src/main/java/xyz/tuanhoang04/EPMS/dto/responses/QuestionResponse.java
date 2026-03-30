package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class QuestionResponse {
    private UUID id;
    private String questionText;
    private String questionAnswer;
    private String questionChoices;
    private String questionImageBase64;
    private Difficulty difficulty;
    private QuestionType questionType;
    private UUID topicId;
    private String topicName;
    private UUID subjectId;
    private String subjectName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
