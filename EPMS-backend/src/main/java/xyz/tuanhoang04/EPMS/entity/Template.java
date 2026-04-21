package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

import java.util.List;

@Getter
@Setter
@Entity
public class Template extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="subject_id")
    private Subject subject;

    @OneToMany(mappedBy = "template", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<TemplatePart> templateParts;

    @OneToMany(mappedBy = "template")
    private List<ExamHistoryRawText> examHistoryRawTexts;
}
