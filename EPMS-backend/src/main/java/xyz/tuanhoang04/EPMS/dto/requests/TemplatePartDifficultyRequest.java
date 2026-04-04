package xyz.tuanhoang04.EPMS.dto.requests;

import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;

import java.math.BigDecimal;

@Getter
@Setter
public class TemplatePartDifficultyRequest {
    private Difficulty difficulty;
    private BigDecimal difficultyValue;
}
