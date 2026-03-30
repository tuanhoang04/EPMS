package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.TemplatePartDifficulty;

import java.util.List;
import java.util.UUID;

public interface TemplatePartDifficultyRepository extends JpaRepository<TemplatePartDifficulty, UUID> {
    List<TemplatePartDifficulty> findByTemplatePartId(UUID templatePartId);
}
