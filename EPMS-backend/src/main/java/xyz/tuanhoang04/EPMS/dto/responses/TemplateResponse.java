package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class TemplateResponse {
    private UUID id;
    private String title;
    private UUID subjectId;
    private String subjectName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
