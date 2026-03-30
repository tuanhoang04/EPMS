package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import xyz.tuanhoang04.EPMS.entity.Subject;

import java.util.List;
import java.util.UUID;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    List<Subject> findByUserId(UUID userId);
    List<Subject> findByNameContainingIgnoreCase(String name);

    @Query("SELECT COUNT(t) FROM Topic t WHERE t.subject.id = :subjectId")
    long countTopicsBySubjectId(@Param("subjectId") UUID subjectId);

    @Query("SELECT COUNT(q) FROM Question q WHERE q.topic.subject.id = :subjectId")
    long countQuestionsBySubjectId(@Param("subjectId") UUID subjectId);
}
