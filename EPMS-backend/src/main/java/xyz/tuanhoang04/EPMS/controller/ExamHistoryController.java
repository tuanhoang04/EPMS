package xyz.tuanhoang04.EPMS.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.dto.responses.ExamHistoryResponse;
import xyz.tuanhoang04.EPMS.service.ExamHistoryService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exam-history")
public class ExamHistoryController {

    private final ExamHistoryService examHistoryService;

    public ExamHistoryController(ExamHistoryService examHistoryService) {
        this.examHistoryService = examHistoryService;
    }

    @GetMapping
    public List<ExamHistoryResponse> getMyHistory(Authentication authentication) {
        return examHistoryService.getHistoryForUser(authentication.getName());
    }

    @PostMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID id, Authentication authentication) {
        byte[] docxBytes = examHistoryService.downloadHistory(id, authentication.getName());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        headers.setContentDispositionFormData("attachment", "exam.docx");
        headers.setContentLength(docxBytes.length);

        return new ResponseEntity<>(docxBytes, headers, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        examHistoryService.deleteHistory(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
