package xyz.tuanhoang04.EPMS.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.dto.requests.SubjectRequest;
import xyz.tuanhoang04.EPMS.dto.responses.SubjectResponse;
import xyz.tuanhoang04.EPMS.service.SubjectService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    public List<SubjectResponse> getAllSubjects() {
        return subjectService.getAllSubjects();
    }

    @GetMapping("/{id}")
    public SubjectResponse getSubjectById(@PathVariable UUID id) {
        return subjectService.getSubjectById(id);
    }

    @PostMapping
    public SubjectResponse createSubject(@RequestBody SubjectRequest request, Authentication authentication) {
        return subjectService.createSubject(request, authentication.getName());
    }

    @PutMapping("/{id}")
    public SubjectResponse updateSubject(@PathVariable UUID id, @RequestBody SubjectRequest request) {
        return subjectService.updateSubject(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteSubject(@PathVariable UUID id) {
        subjectService.deleteSubject(id);
    }
}
