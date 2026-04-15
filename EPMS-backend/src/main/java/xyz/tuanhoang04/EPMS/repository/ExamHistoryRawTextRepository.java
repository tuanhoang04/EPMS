package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.ExamHistoryRawText;

import java.util.List;
import java.util.UUID;

public interface ExamHistoryRawTextRepository extends JpaRepository<ExamHistoryRawText, UUID> {
    List<ExamHistoryRawText> findByTemplateId(UUID templateId);
    long countByTemplateSubjectUserId(UUID userId);
    List<ExamHistoryRawText> findByTitleContainingIgnoreCase(String title);
    List<ExamHistoryRawText> findByTemplateSubjectUserIdOrderByCreatedAtDesc(UUID userId);
}
