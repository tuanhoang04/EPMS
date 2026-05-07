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
    @Column(columnDefinition = "TEXT")
    private String questionText;
    @Column(columnDefinition = "TEXT")
    private String questionAnswer; //non-MCQ questions
    @Column(columnDefinition = "TEXT")
    private String questionChoices; //MCQ questions saved in JSON format
    private String questionImagePath;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Difficulty difficulty;
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private QuestionType questionType;

    private int answerLines = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="topic_id")
    private Topic topic;

}
