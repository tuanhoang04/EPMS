package xyz.tuanhoang04.EPMS.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.requests.SubjectRequest;
import xyz.tuanhoang04.EPMS.dto.responses.SubjectResponse;
import xyz.tuanhoang04.EPMS.entity.Subject;
import xyz.tuanhoang04.EPMS.entity.User;
import xyz.tuanhoang04.EPMS.repository.SubjectRepository;
import xyz.tuanhoang04.EPMS.repository.UserRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    public SubjectService(SubjectRepository subjectRepository, UserRepository userRepository) {
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
    }

    public Page<SubjectResponse> getAllSubjects(int pageIndex, int pageSize) {
        Pageable pageable = PageRequest.of(pageIndex, pageSize);
        return subjectRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    public SubjectResponse getSubjectById(UUID id) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subject not found"));
        return mapToResponse(subject);
    }

    public SubjectResponse createSubject(SubjectRequest request, String currentUserEmail) {
        User user = userRepository.findByEmailAddress(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Subject subject = new Subject();
        subject.setName(request.getName());
        subject.setDescription(request.getDescription());
        subject.setUser(user);

        return mapToResponse(subjectRepository.save(subject));
    }

    public SubjectResponse updateSubject(UUID id, SubjectRequest request) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        subject.setName(request.getName());
        subject.setDescription(request.getDescription());

        return mapToResponse(subjectRepository.save(subject));
    }

    public void deleteSubject(UUID id) {
        if (!subjectRepository.existsById(id)) {
            throw new RuntimeException("Subject not found");
        }
        subjectRepository.deleteById(id);
    }

    private SubjectResponse mapToResponse(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .description(subject.getDescription())
                .topicCount((int) subjectRepository.countTopicsBySubjectId(subject.getId()))
                .questionCount((int) subjectRepository.countQuestionsBySubjectId(subject.getId()))
                .createdAt(subject.getCreatedAt())
                .updatedAt(subject.getUpdatedAt())
                .build();
    }
}
