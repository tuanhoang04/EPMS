package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.Template;

import java.util.List;
import java.util.UUID;

public interface TemplateRepository extends JpaRepository<Template, UUID> {
    List<Template> findBySubjectId(UUID subjectId);
    List<Template> findByTitleContainingIgnoreCase(String title);
}
