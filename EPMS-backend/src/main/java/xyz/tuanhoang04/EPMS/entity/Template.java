package xyz.tuanhoang04.EPMS.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
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

    @OneToMany(mappedBy = "template")
    @JsonManagedReference
    private List<ExamHistoryRawText> examHistoryRawTexts;
}
