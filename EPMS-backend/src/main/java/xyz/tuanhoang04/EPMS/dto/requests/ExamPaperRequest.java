package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ExamPaperRequest {
    private UUID templateId;
    /** Optional custom title — falls back to the template title when blank. */
    private String title;
}
