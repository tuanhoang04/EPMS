package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class TemplateRequest {
    private String title;
    private UUID subjectId;
    private List<TemplatePartRequest> parts;
}
