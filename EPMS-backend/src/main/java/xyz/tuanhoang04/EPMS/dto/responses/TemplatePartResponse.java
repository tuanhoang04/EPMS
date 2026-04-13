package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class TemplatePartResponse {
    private UUID id;
    private String title;
    private int seqNumber;
    private int numberOfQuestions;
    private String questionType;
    private List<TemplatePartTopicResponse> topics;
}
