package xyz.tuanhoang04.EPMS.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

import java.util.List;

@Getter
@Setter
@Entity
public class Topic extends BaseEntity {
    private String topicName;
    private String topicDescription;

    @OneToMany(mappedBy = "topic")
    @JsonManagedReference
    private List<Question> questions;
}
