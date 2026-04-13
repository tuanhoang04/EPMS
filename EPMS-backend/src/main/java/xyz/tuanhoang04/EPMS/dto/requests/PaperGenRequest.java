package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class PaperGenRequest {
    private String title;
    private String subject;
    private List<PaperGenPartDto> parts;
}
