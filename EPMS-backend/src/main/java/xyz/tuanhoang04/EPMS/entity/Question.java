package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

@Getter
@Setter
@Entity
public class Question extends BaseEntity {
    private String questionText;
    private String questionAnswer; //non-MCQ questions
    @Column(columnDefinition = "TEXT")
    private String questionChoices; //MCQ questions saved in JSON format
    private String questionImagePath;

    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;
    @Enumerated(EnumType.STRING)
    private QuestionType questionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="topic_id")
    private Topic topic;

}
