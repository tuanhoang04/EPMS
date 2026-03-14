package xyz.tuanhoang04.EPMS.entity;

import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.QuestionType;

import java.util.List;

@Getter
@Setter
@Entity
public class TemplatePart {
    private String title;
    private int seqNumber;
    private int numberOfQuestions;

    @Enumerated(EnumType.STRING)
    @Nullable
    private QuestionType questionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="template_id")
    private Template template;

    @OneToMany(mappedBy = "templatePart")
    private TemplatePartDifficulty templatePartDifficulty;

    @ManyToMany
    @JoinTable(
            name = "template_part_topic",
            joinColumns = @JoinColumn(name = "template_part_id"),
            inverseJoinColumns = @JoinColumn(name = "topic_id")
    )
    private List<Topic> topics;
}
