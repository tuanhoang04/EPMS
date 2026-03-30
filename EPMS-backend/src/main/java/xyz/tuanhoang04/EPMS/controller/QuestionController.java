package xyz.tuanhoang04.EPMS.controller;

import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.constant.Difficulty;
import xyz.tuanhoang04.EPMS.dto.requests.QuestionRequest;
import xyz.tuanhoang04.EPMS.dto.responses.QuestionResponse;
import xyz.tuanhoang04.EPMS.service.QuestionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping
    public List<QuestionResponse> getAllQuestions(
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) UUID topicId,
            @RequestParam(required = false) Difficulty difficulty) {
        return questionService.getAllQuestions(subjectId, topicId, difficulty);
    }

    @GetMapping("/{id}")
    public QuestionResponse getQuestionById(@PathVariable UUID id) {
        return questionService.getQuestionById(id);
    }

    @PostMapping
    public QuestionResponse createQuestion(@RequestBody QuestionRequest request) {
        return questionService.createQuestion(request);
    }

    @PutMapping("/{id}")
    public QuestionResponse updateQuestion(@PathVariable UUID id, @RequestBody QuestionRequest request) {
        return questionService.updateQuestion(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteQuestion(@PathVariable UUID id) {
        questionService.deleteQuestion(id);
    }
}
