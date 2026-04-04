package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.QuestionType;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class TemplatePartRequest {
    private String title;
    private int numberOfQuestions;
    private QuestionType questionType;
    private List<UUID> topicIds;
    private List<TemplatePartDifficultyRequest> difficulties;
}
