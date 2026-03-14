package xyz.tuanhoang04.EPMS.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

public class TemplatePart {
    private String title;
    private int seqNumber;
    private int numberOfQuestions;
    private String questionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="topic_id")
    @JsonManagedReference
    private Template template;
}
