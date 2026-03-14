package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
public class TemplatePartDifficulty {
    private Difficulty difficulty;

    @DecimalMin(value = "0.0", message = "Difficulty value must be at least 0")
    @DecimalMax(value = "100.0", message = "Difficulty value must be at most 100")
    private BigDecimal difficultyValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="template_part_id")
    private TemplatePart templatePart;

}
