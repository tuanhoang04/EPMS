package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.Subject;

import java.util.List;
import java.util.UUID;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    List<Subject> findByUserId(UUID userId);
    List<Subject> findByNameContainingIgnoreCase(String name);
}
