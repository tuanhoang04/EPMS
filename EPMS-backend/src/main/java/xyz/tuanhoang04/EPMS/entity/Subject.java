package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Entity
public class Subject {

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id")
    private User user;

    @OneToMany(mappedBy = "subject")
    private List<Topic> topics;

    @OneToMany(mappedBy = "subject")
    private List<Template> templates;
}
