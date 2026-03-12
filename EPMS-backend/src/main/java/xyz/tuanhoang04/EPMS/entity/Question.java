package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

@Getter
@Setter
@Entity
public class Question extends BaseEntity {
    public String questionText;
    public String questionAnswer; //non-MCQ questions
    @Column(columnDefinition = "TEXT")
    public String questionChoices; //saved in JSON format
    public String questionImagePath;

    @Enumerated(EnumType.STRING)
    public Difficulty difficulty;
    @Enumerated(EnumType.STRING)
    public QuestionType questionType;
}
