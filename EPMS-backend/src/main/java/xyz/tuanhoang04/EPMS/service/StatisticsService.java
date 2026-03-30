package xyz.tuanhoang04.EPMS.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.responses.UserStatisticsResponse;
import xyz.tuanhoang04.EPMS.entity.User;
import xyz.tuanhoang04.EPMS.repository.*;

@Service
@Transactional(readOnly = true)
public class StatisticsService {

    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;
    private final QuestionRepository questionRepository;
    private final TemplateRepository templateRepository;
    private final ExamHistoryRawTextRepository examHistoryRawTextRepository;
    private final UserRepository userRepository;

    public StatisticsService(SubjectRepository subjectRepository,
                             TopicRepository topicRepository,
                             QuestionRepository questionRepository,
                             TemplateRepository templateRepository,
                             ExamHistoryRawTextRepository examHistoryRawTextRepository,
                             UserRepository userRepository) {
        this.subjectRepository = subjectRepository;
        this.topicRepository = topicRepository;
        this.questionRepository = questionRepository;
        this.templateRepository = templateRepository;
        this.examHistoryRawTextRepository = examHistoryRawTextRepository;
        this.userRepository = userRepository;
    }

    public UserStatisticsResponse getUserStatistics(String email) {
        User user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return UserStatisticsResponse.builder()
                .subjectCount(subjectRepository.countByUserId(user.getId()))
                .topicCount(topicRepository.countBySubjectUserId(user.getId()))
                .questionCount(questionRepository.countByTopicSubjectUserId(user.getId()))
                .templateCount(templateRepository.countBySubjectUserId(user.getId()))
                .examHistoryCount(examHistoryRawTextRepository.countByTemplateSubjectUserId(user.getId()))
                .build();
    }
}
