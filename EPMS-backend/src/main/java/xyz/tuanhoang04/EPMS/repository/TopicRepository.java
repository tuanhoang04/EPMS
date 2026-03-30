package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.Topic;

import java.util.List;
import java.util.UUID;

public interface TopicRepository extends JpaRepository<Topic, UUID> {
    List<Topic> findBySubjectId(UUID subjectId);
    long countBySubjectUserId(UUID userId);
    List<Topic> findByNameContainingIgnoreCase(String name);
}
