package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.TemplatePart;

import java.util.List;
import java.util.UUID;

public interface TemplatePartRepository extends JpaRepository<TemplatePart, UUID> {
    List<TemplatePart> findByTemplateId(UUID templateId);
    List<TemplatePart> findByTemplateIdOrderBySeqNumberAsc(UUID templateId);
}
