package xyz.tuanhoang04.EPMS.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.dto.requests.QuestionRequest;
import xyz.tuanhoang04.EPMS.dto.responses.QuestionResponse;
import xyz.tuanhoang04.EPMS.entity.Question;
import xyz.tuanhoang04.EPMS.entity.Topic;
import xyz.tuanhoang04.EPMS.repository.QuestionRepository;
import xyz.tuanhoang04.EPMS.repository.TopicRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class QuestionService {

    private final String UPLOAD_DIR = "uploads/questions/";
    private final QuestionRepository questionRepository;
    private final TopicRepository topicRepository;

    public QuestionService(QuestionRepository questionRepository, TopicRepository topicRepository) {
        this.questionRepository = questionRepository;
        this.topicRepository = topicRepository;
    }

    public Page<QuestionResponse> getAllQuestions(UUID subjectId, UUID topicId, Difficulty difficulty, Pageable pageable) {
        Specification<Question> spec = Specification.where(null);

        if (subjectId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("topic").get("subject").get("id"), subjectId));
        }

        if (topicId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("topic").get("id"), topicId));
        }

        if (difficulty != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("difficulty"), difficulty));
        }

        return questionRepository.findAll(spec, pageable)
                .map(this::mapToResponse);
    }

    public QuestionResponse getQuestionById(UUID id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        return mapToResponse(question);
    }

    public QuestionResponse createQuestion(QuestionRequest request) {
        Topic topic = topicRepository.findById(request.getTopicId())
                .orElseThrow(() -> new RuntimeException("Topic not found"));

        Question question = new Question();
        question.setQuestionText(request.getQuestionText());
        question.setQuestionAnswer(request.getQuestionAnswer());
        question.setQuestionChoices(request.getQuestionChoices());

        if (request.getQuestionImageBase64() != null && !request.getQuestionImageBase64().isEmpty()) {
            String imagePath = saveImage(request.getQuestionImageBase64());
            question.setQuestionImagePath(imagePath);
        }

        question.setDifficulty(request.getDifficulty());
        question.setQuestionType(request.getQuestionType());
        question.setTopic(topic);

        return mapToResponse(questionRepository.save(question));
    }

    public QuestionResponse updateQuestion(UUID id, QuestionRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Topic topic = topicRepository.findById(request.getTopicId())
                .orElseThrow(() -> new RuntimeException("Topic not found"));

        question.setQuestionText(request.getQuestionText());
        question.setQuestionAnswer(request.getQuestionAnswer());
        question.setQuestionChoices(request.getQuestionChoices());

        if (request.getQuestionImageBase64() != null && !request.getQuestionImageBase64().isEmpty()) {
            String imagePath = saveImage(request.getQuestionImageBase64());
            question.setQuestionImagePath(imagePath);
        }

        question.setDifficulty(request.getDifficulty());
        question.setQuestionType(request.getQuestionType());
        question.setTopic(topic);

        return mapToResponse(questionRepository.save(question));
    }

    public void deleteQuestion(UUID id) {
        if (!questionRepository.existsById(id)) {
            throw new RuntimeException("Question not found");
        }
        questionRepository.deleteById(id);
    }

    private String saveImage(String base64Data) {
        try {
            // Remove prefix if exists (e.g., "data:image/png;base64,")
            String base64Image = base64Data;
            String extension = "png"; // Default extension

            if (base64Data.contains(",")) {
                String[] parts = base64Data.split(",");
                String header = parts[0];
                base64Image = parts[1];

                // Extract extension from header
                if (header.contains("image/")) {
                    extension = header.substring(header.indexOf("image/") + 6, header.indexOf(";"));
                }
            }

            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            String fileName = UUID.randomUUID().toString() + "." + extension;

            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(fileName);
            Files.write(filePath, imageBytes);

            return UPLOAD_DIR + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Could not save image", e);
        }
    }

    private QuestionResponse mapToResponse(Question question) {
        String base64Image = null;
        if (question.getQuestionImagePath() != null) {
            base64Image = loadImageAsBase64(question.getQuestionImagePath());
        }

        return QuestionResponse.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .questionAnswer(question.getQuestionAnswer())
                .questionChoices(question.getQuestionChoices())
                .questionImageBase64(base64Image)
                .difficulty(question.getDifficulty())
                .questionType(question.getQuestionType())
                .topicId(question.getTopic().getId())
                .topicName(question.getTopic().getName())
                .subjectId(question.getTopic().getSubject().getId())
                .subjectName(question.getTopic().getSubject().getName())
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }

    private String loadImageAsBase64(String imagePath) {
        try {
            Path path = Paths.get(imagePath);
            if (Files.exists(path)) {
                byte[] bytes = Files.readAllBytes(path);
                String extension = "";
                int i = imagePath.lastIndexOf('.');
                if (i > 0) {
                    extension = imagePath.substring(i + 1);
                }
                return "data:image/" + extension + ";base64," + Base64.getEncoder().encodeToString(bytes);
            }
        } catch (IOException e) {
            // Log error or handle gracefully
            System.err.println("Error reading image: " + e.getMessage());
        }
        return null;
    }
}
