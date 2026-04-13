package xyz.tuanhoang04.EPMS.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.dto.requests.ExamPaperRequest;
import xyz.tuanhoang04.EPMS.service.ExamPaperService;

@RestController
@RequestMapping("/api/exam-papers")
public class ExamPaperController {

    private final ExamPaperService examPaperService;

    public ExamPaperController(ExamPaperService examPaperService) {
        this.examPaperService = examPaperService;
    }

    /**
     * Generate a .docx exam paper from a template.
     *
     * <p>Request body: {@code { "templateId": "uuid", "title": "optional custom title" }}
     *
     * <p>Response: binary .docx file download.
     */
    @PostMapping("/generate")
    public ResponseEntity<byte[]> generate(@RequestBody ExamPaperRequest request) {
        byte[] docxBytes = examPaperService.generateExamPaper(request);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        headers.setContentDispositionFormData("attachment", "exam.docx");
        headers.setContentLength(docxBytes.length);

        return new ResponseEntity<>(docxBytes, headers, HttpStatus.OK);
    }
}
