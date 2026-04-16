package xyz.tuanhoang04.EPMS.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.constant.QuestionType;
import xyz.tuanhoang04.EPMS.dto.requests.*;
import xyz.tuanhoang04.EPMS.entity.*;
import xyz.tuanhoang04.EPMS.repository.ExamHistoryRawTextRepository;
import xyz.tuanhoang04.EPMS.repository.QuestionRepository;
import xyz.tuanhoang04.EPMS.repository.TemplateRepository;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.Base64;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ExamPaperService {

    @Value("${paper.generator.url:http://localhost:3001}")
    private String paperGeneratorUrl;

    private final TemplateRepository templateRepository;
    private final QuestionRepository questionRepository;
    private final ExamHistoryRawTextRepository examHistoryRawTextRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ExamPaperService(
            TemplateRepository templateRepository,
            QuestionRepository questionRepository,
            ExamHistoryRawTextRepository examHistoryRawTextRepository,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.templateRepository = templateRepository;
        this.questionRepository = questionRepository;
        this.examHistoryRawTextRepository = examHistoryRawTextRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public byte[] generateExamPaper(ExamPaperRequest request) {
        Template template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new RuntimeException("Template not found: " + request.getTemplateId()));

        String title = (request.getTitle() != null && !request.getTitle().isBlank())
                ? request.getTitle()
                : template.getTitle();

        List<PaperGenPartDto> parts = template.getTemplateParts().stream()
                .sorted(Comparator.comparingInt(TemplatePart::getSeqNumber))
                .map(part -> {
                    List<Question> questions = selectQuestionsForPart(part);
                    List<PaperGenQuestionDto> questionDtos = questions.stream()
                            .map(q -> PaperGenQuestionDto.builder()
                                    .id(q.getId().toString())
                                    .questionText(q.getQuestionText())
                                    .questionType(q.getQuestionType().name())
                                    .questionChoices(q.getQuestionChoices())
                                    .questionAnswer(q.getQuestionAnswer())
                                    .difficulty(q.getDifficulty().name())
                                    .questionImageBase64(loadImageAsBase64(q.getQuestionImagePath()))
                                    .build())
                            .collect(Collectors.toList());
                    return PaperGenPartDto.builder()
                            .title(part.getTitle())
                            .questions(questionDtos)
                            .build();
                })
                .collect(Collectors.toList());

        PaperGenRequest paperGenRequest = PaperGenRequest.builder()
                .title(title)
                .subject(template.getSubject().getName())
                .parts(parts)
                .build();

        byte[] docxBytes = callPaperGenerator(paperGenRequest);

        saveHistory(template, title, paperGenRequest);

        return docxBytes;
    }

    private void saveHistory(Template template, String title, PaperGenRequest paperGenRequest) {
        try {
            String rawText = objectMapper.writeValueAsString(paperGenRequest);
            ExamHistoryRawText history = new ExamHistoryRawText();
            history.setTitle(title);
            history.setRawText(rawText);
            history.setTemplate(template);
            examHistoryRawTextRepository.save(history);
        } catch (Exception e) {
            // Do not fail the generation if history saving fails
        }
    }

    private List<Question> selectQuestionsForPart(TemplatePart part) {
        List<UUID> topicIds = part.getTopics().stream()
                .map(Topic::getId)
                .collect(Collectors.toList());

        if (topicIds.isEmpty()) return Collections.emptyList();

        int totalNeeded = part.getNumberOfQuestions();
        List<TemplatePartDifficulty> distributions = part.getTemplatePartDifficulties();

        List<Question> selected = new ArrayList<>();
        Set<UUID> selectedIds = new HashSet<>();

        // Select by difficulty distribution first
        if (distributions != null && !distributions.isEmpty()) {
            for (TemplatePartDifficulty dist : distributions) {
                if (dist.getDifficultyValue().compareTo(BigDecimal.ZERO) <= 0) continue;

                int count = (int) Math.round(totalNeeded * dist.getDifficultyValue().doubleValue() / 100.0);
                if (count == 0) continue;

                List<Question> available = fetchByDifficulty(topicIds, dist.getDifficulty(), part.getQuestionType());
                available = available.stream()
                        .filter(q -> !selectedIds.contains(q.getId()))
                        .collect(Collectors.toList());
                Collections.shuffle(available);

                available.stream().limit(count).forEach(q -> {
                    selected.add(q);
                    selectedIds.add(q.getId());
                });
            }
        }

        // Fill any remaining slots from any matching question
        if (selected.size() < totalNeeded) {
            List<Question> remaining = fetchAll(topicIds, part.getQuestionType());
            remaining = remaining.stream()
                    .filter(q -> !selectedIds.contains(q.getId()))
                    .collect(Collectors.toList());
            Collections.shuffle(remaining);

            int needed = totalNeeded - selected.size();
            remaining.stream().limit(needed).forEach(q -> {
                selected.add(q);
                selectedIds.add(q.getId());
            });
        }

        Collections.shuffle(selected);
        return selected.stream().limit(totalNeeded).collect(Collectors.toList());
    }

    private List<Question> fetchByDifficulty(List<UUID> topicIds, Difficulty difficulty, QuestionType questionType) {
        if (questionType != null) {
            return questionRepository.findByTopicIdInAndDifficultyInAndQuestionType(
                    topicIds, List.of(difficulty), questionType);
        }
        return questionRepository.findByTopicIdInAndDifficultyIn(topicIds, List.of(difficulty));
    }

    private String loadImageAsBase64(String imagePath) {
        if (imagePath == null) return null;
        try {
            Path path = Paths.get(imagePath);
            if (!Files.exists(path)) return null;
            byte[] bytes = Files.readAllBytes(path);
            int dot = imagePath.lastIndexOf('.');
            String ext = dot > 0 ? imagePath.substring(dot + 1) : "png";
            return "data:image/" + ext + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            System.err.println("Error reading question image for paper generation: " + e.getMessage());
            return null;
        }
    }

    private List<Question> fetchAll(List<UUID> topicIds, QuestionType questionType) {
        if (questionType != null) {
            return questionRepository.findByTopicIdInAndQuestionType(topicIds, questionType);
        }
        return questionRepository.findByTopicIdIn(topicIds);
    }

    public byte[] regenerateFromHistory(String rawText) {
        try {
            PaperGenRequest paperGenRequest = objectMapper.readValue(rawText, PaperGenRequest.class);
            return callPaperGenerator(paperGenRequest);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse history raw text: " + e.getMessage(), e);
        }
    }

    private byte[] callPaperGenerator(PaperGenRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.ALL));

        HttpEntity<PaperGenRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    paperGeneratorUrl + "/generate",
                    HttpMethod.POST,
                    entity,
                    byte[].class);

            if (response.getBody() == null) {
                throw new RuntimeException("Paper generator returned an empty response");
            }

            return response.getBody();
        } catch (HttpStatusCodeException ex) {
            throw new RuntimeException(
                    "Paper generator service error (" + ex.getStatusCode() + "): " + ex.getResponseBodyAsString(), ex);
        }
    }
}
