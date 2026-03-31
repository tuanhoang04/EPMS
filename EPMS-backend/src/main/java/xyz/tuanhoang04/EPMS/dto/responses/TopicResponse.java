package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class TopicResponse {
    private UUID id;
    private String name;
    private String description;
    private UUID subjectId;
    private int questionCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
