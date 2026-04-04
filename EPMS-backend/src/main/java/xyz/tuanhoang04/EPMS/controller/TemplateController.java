package xyz.tuanhoang04.EPMS.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.dto.requests.TemplateRequest;
import xyz.tuanhoang04.EPMS.dto.responses.TemplateResponse;
import xyz.tuanhoang04.EPMS.service.TemplateService;

import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public Page<TemplateResponse> getAllTemplates(
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return templateService.getAllTemplates(subjectId, PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public TemplateResponse getTemplateById(@PathVariable UUID id) {
        return templateService.getTemplateById(id);
    }

    @PostMapping
    public TemplateResponse createTemplate(@RequestBody TemplateRequest request) {
        return templateService.createTemplate(request);
    }

    @PutMapping("/{id}")
    public TemplateResponse updateTemplate(@PathVariable UUID id, @RequestBody TemplateRequest request) {
        return templateService.updateTemplate(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
    }
}
