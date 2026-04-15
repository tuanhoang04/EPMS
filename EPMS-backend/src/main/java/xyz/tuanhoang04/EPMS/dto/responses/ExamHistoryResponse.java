package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class ExamHistoryResponse {
    private UUID id;
    private String title;
    private String description;
    private String rawText;
    private UUID templateId;
    private String templateTitle;
    private OffsetDateTime createdAt;
}
