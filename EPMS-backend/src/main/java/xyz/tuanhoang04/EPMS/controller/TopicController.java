package xyz.tuanhoang04.EPMS.controller;

import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.dto.requests.TopicRequest;
import xyz.tuanhoang04.EPMS.dto.responses.TopicResponse;
import xyz.tuanhoang04.EPMS.service.TopicService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/topics")
public class TopicController {

    private final TopicService topicService;

    public TopicController(TopicService topicService) {
        this.topicService = topicService;
    }

    @GetMapping
    public List<TopicResponse> getAllTopics() {
        return topicService.getAllTopics();
    }

    @GetMapping("/{id}")
    public TopicResponse getTopicById(@PathVariable UUID id) {
        return topicService.getTopicById(id);
    }

    @GetMapping("/subject/{subjectId}")
    public List<TopicResponse> getTopicsBySubjectId(@PathVariable UUID subjectId) {
        return topicService.getTopicsBySubjectId(subjectId);
    }

    @PostMapping
    public TopicResponse createTopic(@RequestBody TopicRequest request) {
        return topicService.createTopic(request);
    }

    @PutMapping("/{id}")
    public TopicResponse updateTopic(@PathVariable UUID id, @RequestBody TopicRequest request) {
        return topicService.updateTopic(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteTopic(@PathVariable UUID id) {
        topicService.deleteTopic(id);
    }
}
