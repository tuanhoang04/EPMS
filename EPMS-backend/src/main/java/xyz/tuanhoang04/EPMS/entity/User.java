package xyz.tuanhoang04.EPMS.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.Setter;
import xyz.tuanhoang04.EPMS.entity.base.BaseEntity;

import java.util.List;

@Getter
@Setter
@Entity
public class User extends BaseEntity {
    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String emailAddress;

    @Column(nullable = false)
    private String passwordHash;

    @OneToMany(mappedBy = "user")
    private List<Subject> subjects;
}
