package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class PaperGenPartDto {
    private String title;
    private List<PaperGenQuestionDto> questions;
}
