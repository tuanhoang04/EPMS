package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

import java.util.List;

@Getter
@Setter
@Entity
public class Topic extends BaseEntity {
    private String name;
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="subject_id")
    private Subject subject;

    @OneToMany(mappedBy = "topic")
    private List<Question> questions;

    @ManyToMany(mappedBy = "topics")
    private List<TemplatePart> templateParts;
}
