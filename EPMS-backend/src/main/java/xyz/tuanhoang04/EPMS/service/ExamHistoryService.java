package xyz.tuanhoang04.EPMS.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.responses.ExamHistoryResponse;
import xyz.tuanhoang04.EPMS.entity.ExamHistoryRawText;
import xyz.tuanhoang04.EPMS.entity.User;
import xyz.tuanhoang04.EPMS.repository.ExamHistoryRawTextRepository;
import xyz.tuanhoang04.EPMS.repository.UserRepository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ExamHistoryService {

    private final ExamHistoryRawTextRepository examHistoryRawTextRepository;
    private final UserRepository userRepository;
    private final ExamPaperService examPaperService;

    public ExamHistoryService(
            ExamHistoryRawTextRepository examHistoryRawTextRepository,
            UserRepository userRepository,
            ExamPaperService examPaperService) {
        this.examHistoryRawTextRepository = examHistoryRawTextRepository;
        this.userRepository = userRepository;
        this.examPaperService = examPaperService;
    }

    public List<ExamHistoryResponse> getHistoryForUser(String email) {
        User user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return examHistoryRawTextRepository
                .findByTemplateSubjectUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public byte[] downloadHistory(UUID historyId, String email) {
        User user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ExamHistoryRawText history = examHistoryRawTextRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("Exam history not found: " + historyId));

        // Ensure this history belongs to the requesting user
        if (!history.getTemplate().getSubject().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }

        return examPaperService.regenerateFromHistory(history.getRawText());
    }

    @Transactional
    public void deleteHistory(UUID historyId, String email) {
        User user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ExamHistoryRawText history = examHistoryRawTextRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("Exam history not found: " + historyId));

        if (!history.getTemplate().getSubject().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }

        examHistoryRawTextRepository.delete(history);
    }

    private ExamHistoryResponse toResponse(ExamHistoryRawText history) {
        return ExamHistoryResponse.builder()
                .id(history.getId())
                .title(history.getTitle())
                .description(history.getDescription())
                .rawText(history.getRawText())
                .templateId(history.getTemplate().getId())
                .templateTitle(history.getTemplate().getTitle())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
