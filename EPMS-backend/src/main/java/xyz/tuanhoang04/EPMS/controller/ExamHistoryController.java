package xyz.tuanhoang04.EPMS.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    /**
     * Serves a history image file by filename. Images live in the dedicated
     * {@code uploads/exam-history-images/} directory and are distinct from live question images.
     * Requires authentication (enforced globally by Spring Security).
     * Filenames are UUIDs so they are practically unguessable.
     */
    @GetMapping("/images/{filename}")
    public ResponseEntity<byte[]> getHistoryImage(@PathVariable String filename) {
        // Guard against path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }

        Path imagePath = Paths.get("uploads/exam-history-images/", filename);
        if (!Files.exists(imagePath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            byte[] bytes = Files.readAllBytes(imagePath);
            String ext = filename.contains(".")
                    ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
                    : "png";
            MediaType mediaType = switch (ext) {
                case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
                case "gif"         -> MediaType.parseMediaType("image/gif");
                case "bmp"         -> MediaType.parseMediaType("image/bmp");
                default            -> MediaType.IMAGE_PNG;
            };
            return ResponseEntity.ok().contentType(mediaType).body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
