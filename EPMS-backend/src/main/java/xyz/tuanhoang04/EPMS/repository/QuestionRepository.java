package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;
import xyz.tuanhoang04.EPMS.entity.Question;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByTopicId(UUID topicId);
    List<Question> findByDifficulty(Difficulty difficulty);
    List<Question> findByQuestionType(QuestionType questionType);
    List<Question> findByTopicIdInAndDifficultyInAndQuestionType(List<UUID> topicIds, List<Difficulty> difficulties, QuestionType questionType);
}
