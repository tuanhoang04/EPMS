package xyz.tuanhoang04.EPMS.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.requests.TopicRequest;
import xyz.tuanhoang04.EPMS.dto.responses.TopicResponse;
import xyz.tuanhoang04.EPMS.entity.Subject;
import xyz.tuanhoang04.EPMS.entity.Topic;
import xyz.tuanhoang04.EPMS.repository.SubjectRepository;
import xyz.tuanhoang04.EPMS.repository.TopicRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TopicService {

    private final TopicRepository topicRepository;
    private final SubjectRepository subjectRepository;

    public TopicService(TopicRepository topicRepository, SubjectRepository subjectRepository) {
        this.topicRepository = topicRepository;
        this.subjectRepository = subjectRepository;
    }

    public List<TopicResponse> getAllTopics() {
        return topicRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public TopicResponse getTopicById(UUID id) {
        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Topic not found"));
        return mapToResponse(topic);
    }

    public List<TopicResponse> getTopicsBySubjectId(UUID subjectId) {
        return topicRepository.findBySubjectId(subjectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public TopicResponse createTopic(TopicRequest request) {
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        Topic topic = new Topic();
        topic.setName(request.getName());
        topic.setDescription(request.getDescription());
        topic.setSubject(subject);

        return mapToResponse(topicRepository.save(topic));
    }

    public TopicResponse updateTopic(UUID id, TopicRequest request) {
        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Topic not found"));

        if (request.getSubjectId() != null && !topic.getSubject().getId().equals(request.getSubjectId())) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new RuntimeException("Subject not found"));
            topic.setSubject(subject);
        }

        topic.setName(request.getName());
        topic.setDescription(request.getDescription());

        return mapToResponse(topicRepository.save(topic));
    }

    public void deleteTopic(UUID id) {
        if (!topicRepository.existsById(id)) {
            throw new RuntimeException("Topic not found");
        }
        topicRepository.deleteById(id);
    }

    private TopicResponse mapToResponse(Topic topic) {
        return TopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .description(topic.getDescription())
                .subjectId(topic.getSubject().getId())
                .questionCount(topic.getQuestions() != null ? topic.getQuestions().size() : 0)
                .createdAt(topic.getCreatedAt())
                .updatedAt(topic.getUpdatedAt())
                .build();
    }
}
