package xyz.tuanhoang04.EPMS.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

@Getter
@Setter
@Entity
public class ExamHistoryRawText extends BaseEntity {

    @Column(nullable = false)
    private String title;
    private String description;
    private String rawText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="template_id")
    @JsonManagedReference
    private Template template;
}
