package xyz.tuanhoang04.EPMS.service;

import com.fasterxml.jackson.core.type.TypeReference;
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

        // Shuffle choices and balance the answer-key distribution across all eligible questions
        balanceAnswerDistribution(parts);

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

    // ── Answer-key distribution balancing ────────────────────────────────────────

    /**
     * Tracks a single eligible question during the answer-distribution balancing pass.
     * Holds a reference to the mutable DTO and the target position (0-indexed) that the
     * correct answer should occupy after shuffling.
     */
    private static class QuestionSlot {
        final PaperGenQuestionDto dto;
        final int choiceCount;   // number of choices (2 for TRUE_FALSE)
        int targetPosition;      // 0-indexed; 0 → label "A", 1 → "B", etc.

        QuestionSlot(PaperGenQuestionDto dto, int choiceCount) {
            this.dto = dto;
            this.choiceCount = choiceCount;
            this.targetPosition = 0;
        }

        /** Letter label corresponding to the current targetPosition ('A', 'B', …). */
        String answerLabel() {
            return String.valueOf((char) ('A' + targetPosition));
        }
    }

    /** No more than this many consecutive questions in the paper may share the same answer label. */
    private static final int MAX_CONSECUTIVE_SAME_ANSWER = 4;

    /**
     * Main entry point for answer-key balancing. Operates on the already-assembled
     * {@code parts} list and modifies each eligible DTO's {@code questionChoices} in place.
     *
     * <p>Only {@code MULTIPLE_CHOICE_ONE_RIGHT_CHOICE} and {@code TRUE_FALSE} questions
     * participate — multiple-correct-answer questions are left untouched because they have
     * no single "answer position" to balance.</p>
     *
     * <p>Steps:</p>
     * <ol>
     *   <li>Collect eligible questions in paper order.</li>
     *   <li>Group by choice count; within each group assign answer positions so each label
     *       (A, B, C, …) is used as equally as possible (floor or ceil of N/K times).</li>
     *   <li>Shuffle each question's choices to put the correct answer at the assigned
     *       position; wrong choices are randomly reordered.</li>
     *   <li>Scan the full ordered list and fix any run of more than
     *       {@link #MAX_CONSECUTIVE_SAME_ANSWER} consecutive identical answer labels by
     *       swapping target positions with a later question of the same choice count.</li>
     * </ol>
     *
     * <p>If the question count for a given choice-count group is too small to achieve
     * perfect balance, the best approximation is used without throwing an error.</p>
     */
    private void balanceAnswerDistribution(List<PaperGenPartDto> parts) {
        List<QuestionSlot> slots = collectEligibleSlots(parts);
        if (slots.isEmpty()) return;

        assignBalancedPositions(slots);

        for (QuestionSlot slot : slots) {
            applyTargetPosition(slot);
        }

        enforceMaxConsecutiveStreak(slots);
    }

    /**
     * Walks every part and question in paper order and wraps each eligible question
     * (MCQ one-right-choice or TRUE_FALSE) in a {@link QuestionSlot}.
     * Questions that cannot be parsed or lack answer data are silently skipped.
     */
    private List<QuestionSlot> collectEligibleSlots(List<PaperGenPartDto> parts) {
        List<QuestionSlot> slots = new ArrayList<>();
        for (PaperGenPartDto part : parts) {
            for (PaperGenQuestionDto q : part.getQuestions()) {
                String type = q.getQuestionType();
                if ("TRUE_FALSE".equals(type) && q.getQuestionAnswer() != null) {
                    slots.add(new QuestionSlot(q, 2));
                } else if ("MULTIPLE_CHOICE_ONE_RIGHT_CHOICE".equals(type)) {
                    List<Map<String, Object>> choices = parseChoicesJson(q.getQuestionChoices());
                    if (choices != null && choices.size() >= 2) {
                        slots.add(new QuestionSlot(q, choices.size()));
                    }
                }
            }
        }
        return slots;
    }

    /**
     * Groups slots by their choice count, then for each group computes and assigns a
     * target answer position such that each position (0, 1, 2, …) is used either
     * {@code floor(N/K)} or {@code ceil(N/K)} times.
     *
     * <p>The assignment list is shuffled before being handed out so consecutive questions
     * in the paper are unlikely to receive the same position purely from the distribution
     * algorithm.</p>
     */
    private void assignBalancedPositions(List<QuestionSlot> slots) {
        Map<Integer, List<QuestionSlot>> groups = new LinkedHashMap<>();
        for (QuestionSlot slot : slots) {
            groups.computeIfAbsent(slot.choiceCount, k -> new ArrayList<>()).add(slot);
        }

        for (Map.Entry<Integer, List<QuestionSlot>> entry : groups.entrySet()) {
            int k = entry.getKey();
            List<QuestionSlot> group = entry.getValue();
            List<Integer> positions = buildBalancedPositionList(group.size(), k);
            for (int i = 0; i < group.size(); i++) {
                group.get(i).targetPosition = positions.get(i);
            }
        }
    }

    /**
     * Builds a shuffled list of {@code n} target positions (0-indexed) for {@code k} choices
     * such that position {@code p} appears {@code floor(n/k) + (p < n%k ? 1 : 0)} times.
     * The shuffle randomises which questions receive which position.
     */
    private List<Integer> buildBalancedPositionList(int n, int k) {
        List<Integer> positions = new ArrayList<>(n);
        int base  = n / k;
        int extra = n % k; // first `extra` positions get one additional assignment
        for (int p = 0; p < k; p++) {
            int count = base + (p < extra ? 1 : 0);
            for (int j = 0; j < count; j++) {
                positions.add(p);
            }
        }
        Collections.shuffle(positions);
        return positions;
    }

    /**
     * Dispatches to the appropriate shuffle helper based on question type.
     * MCQ: moves the {@code isAnswer=true} choice to {@code slot.targetPosition} and
     * randomly re-orders all wrong choices.
     * TRUE_FALSE: reconstructs the two choices from {@code questionAnswer}, placing the
     * correct one at {@code slot.targetPosition}, and stores the result in
     * {@code questionChoices} so the generator uses the shuffled order.
     */
    private void applyTargetPosition(QuestionSlot slot) {
        if ("TRUE_FALSE".equals(slot.dto.getQuestionType())) {
            applyTrueFalsePosition(slot.dto, slot.targetPosition);
        } else {
            List<Map<String, Object>> choices = parseChoicesJson(slot.dto.getQuestionChoices());
            if (choices != null) {
                applyMcqPosition(slot.dto, choices, slot.targetPosition);
            }
        }
    }

    /**
     * Re-orders a MCQ question's choices so the correct answer ({@code isAnswer=true})
     * ends up at {@code targetPosition}. Wrong choices are randomly shuffled into the
     * remaining positions. Updates {@code dto.questionChoices} in place.
     *
     * @param dto            the question DTO whose choices will be rewritten
     * @param choices        current parsed choices; exactly one must have {@code isAnswer=true}
     * @param targetPosition 0-indexed position for the correct answer
     */
    private void applyMcqPosition(PaperGenQuestionDto dto,
                                   List<Map<String, Object>> choices,
                                   int targetPosition) {
        Map<String, Object> correctChoice = null;
        List<Map<String, Object>> wrongChoices = new ArrayList<>();
        for (Map<String, Object> choice : choices) {
            if (Boolean.TRUE.equals(choice.get("isAnswer"))) {
                correctChoice = choice;
            } else {
                wrongChoices.add(choice);
            }
        }
        if (correctChoice == null) return; // malformed data — skip silently

        Collections.shuffle(wrongChoices); // randomise wrong-choice order
        wrongChoices.add(targetPosition, correctChoice); // insert answer at target slot

        String json = serializeChoicesJson(wrongChoices);
        if (json != null) dto.setQuestionChoices(json);
    }

    /**
     * Constructs True/False choices ordered so the correct answer sits at
     * {@code targetPosition} (0 = "A", 1 = "B"). The answer identity comes from
     * {@code dto.questionAnswer} (case-insensitive "true" check). Stores the result
     * in {@code dto.questionChoices} so the paper generator and history preview both
     * render the choices in the correct shuffled order.
     *
     * @param dto            the TRUE_FALSE question DTO
     * @param targetPosition 0 = correct answer at "A", 1 = correct answer at "B"
     */
    private void applyTrueFalsePosition(PaperGenQuestionDto dto, int targetPosition) {
        boolean trueIsAnswer = "true".equalsIgnoreCase(dto.getQuestionAnswer());

        Map<String, Object> answerChoice = new LinkedHashMap<>();
        answerChoice.put("value", trueIsAnswer ? "True" : "False");
        answerChoice.put("isAnswer", true);

        Map<String, Object> otherChoice = new LinkedHashMap<>();
        otherChoice.put("value", trueIsAnswer ? "False" : "True");
        otherChoice.put("isAnswer", false);

        List<Map<String, Object>> choices = new ArrayList<>();
        if (targetPosition == 0) {
            choices.add(answerChoice);
            choices.add(otherChoice);
        } else {
            choices.add(otherChoice);
            choices.add(answerChoice);
        }

        String json = serializeChoicesJson(choices);
        if (json != null) dto.setQuestionChoices(json);
    }

    /**
     * Post-processes the ordered slot list to ensure no run of more than
     * {@link #MAX_CONSECUTIVE_SAME_ANSWER} consecutive questions shares the same answer
     * label.
     *
     * <p>When a violation is detected at position {@code i}, the method searches forward
     * for the nearest slot with the <em>same choice count</em> and a <em>different</em>
     * answer label, then swaps their {@code targetPosition} values and re-shuffles both.
     * Restricting swaps to equal-choice-count pairs preserves the per-group distribution
     * balance established by {@link #assignBalancedPositions}.</p>
     *
     * <p>If no valid swap partner exists (e.g., all remaining questions of that choice
     * count share the same answer), the violation is left as-is — this is unavoidable
     * when the question pool is too small to fully satisfy the constraint.</p>
     *
     * <p>The scan restarts after each successful swap (worst-case O(N²)) but this is
     * acceptable for typical exam sizes. A pass limit of {@code slots.size()} prevents
     * any degenerate looping.</p>
     */
    private void enforceMaxConsecutiveStreak(List<QuestionSlot> slots) {
        if (slots.size() <= MAX_CONSECUTIVE_SAME_ANSWER) return;

        boolean changed = true;
        int passLimit = slots.size(); // safety cap; convergence is guaranteed in practice
        while (changed && passLimit-- > 0) {
            changed = false;
            int streak = 1;
            for (int i = 1; i < slots.size(); i++) {
                boolean sameLabel = slots.get(i).answerLabel().equals(slots.get(i - 1).answerLabel());
                streak = sameLabel ? streak + 1 : 1;

                if (streak > MAX_CONSECUTIVE_SAME_ANSWER) {
                    QuestionSlot violator = slots.get(i);
                    // Find the nearest later slot with the same choice count but a different label
                    for (int j = i + 1; j < slots.size(); j++) {
                        QuestionSlot candidate = slots.get(j);
                        if (candidate.choiceCount == violator.choiceCount
                                && !candidate.answerLabel().equals(violator.answerLabel())) {
                            // Swap target positions and re-apply the choice shuffle for both
                            int tmp = violator.targetPosition;
                            violator.targetPosition = candidate.targetPosition;
                            candidate.targetPosition = tmp;
                            applyTargetPosition(violator);
                            applyTargetPosition(candidate);
                            changed = true;
                            break;
                        }
                    }
                    break; // restart the streak scan (changed=true) or accept defeat (changed=false)
                }
            }
        }
    }

    /**
     * Parses a JSON choices string into a list of choice maps ({@code value}, {@code isAnswer}).
     * Returns {@code null} if the string is null, blank, or cannot be parsed.
     */
    private List<Map<String, Object>> parseChoicesJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Serialises a list of choice maps back to a compact JSON string.
     * Returns {@code null} if serialisation fails.
     */
    private String serializeChoicesJson(List<Map<String, Object>> choices) {
        try {
            return objectMapper.writeValueAsString(choices);
        } catch (Exception e) {
            return null;
        }
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
