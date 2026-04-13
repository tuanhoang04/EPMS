package xyz.tuanhoang04.EPMS.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.requests.TemplatePartDifficultyRequest;
import xyz.tuanhoang04.EPMS.dto.requests.TemplatePartRequest;
import xyz.tuanhoang04.EPMS.dto.requests.TemplateRequest;
import xyz.tuanhoang04.EPMS.dto.responses.TemplatePartResponse;
import xyz.tuanhoang04.EPMS.dto.responses.TemplatePartTopicResponse;
import xyz.tuanhoang04.EPMS.dto.responses.TemplateResponse;
import xyz.tuanhoang04.EPMS.entity.*;
import xyz.tuanhoang04.EPMS.repository.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final SubjectRepository subjectRepository;
    private final TemplatePartRepository templatePartRepository;
    private final TemplatePartDifficultyRepository templatePartDifficultyRepository;
    private final TopicRepository topicRepository;

    public TemplateService(TemplateRepository templateRepository,
                           SubjectRepository subjectRepository,
                           TemplatePartRepository templatePartRepository,
                           TemplatePartDifficultyRepository templatePartDifficultyRepository,
                           TopicRepository topicRepository) {
        this.templateRepository = templateRepository;
        this.subjectRepository = subjectRepository;
        this.templatePartRepository = templatePartRepository;
        this.templatePartDifficultyRepository = templatePartDifficultyRepository;
        this.topicRepository = topicRepository;
    }

    public Page<TemplateResponse> getAllTemplates(UUID subjectId, Pageable pageable) {
        Page<Template> templates;
        if (subjectId != null) {
            templates = templateRepository.findBySubjectId(subjectId, pageable);
        } else {
            templates = templateRepository.findAll(pageable);
        }
        return templates.map(this::mapToResponse);
    }

    public TemplateResponse getTemplateById(UUID id) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        return mapToResponse(template);
    }

    @Transactional
    public TemplateResponse createTemplate(TemplateRequest request) {
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        Template template = new Template();
        template.setTitle(request.getTitle());
        template.setSubject(subject);
        template = templateRepository.save(template);

        if (request.getParts() != null) {
            saveParts(template, request.getParts());
        }

        return mapToResponse(template);
    }

    @Transactional
    public TemplateResponse updateTemplate(UUID id, TemplateRequest request) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Subject not found"));

        template.setTitle(request.getTitle());
        template.setSubject(subject);
        template = templateRepository.save(template);

        // Rebuild parts: delete existing then recreate
        List<TemplatePart> existingParts = templatePartRepository.findByTemplateId(id);
        for (TemplatePart part : existingParts) {
            templatePartDifficultyRepository.deleteAll(part.getTemplatePartDifficulties());
        }
        templatePartRepository.deleteAll(existingParts);

        if (request.getParts() != null) {
            saveParts(template, request.getParts());
        }

        return mapToResponse(template);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        templateRepository.deleteById(id);
    }

    private void saveParts(Template template, List<TemplatePartRequest> partRequests) {
        int seq = 1;
        for (TemplatePartRequest partRequest : partRequests) {
            TemplatePart part = new TemplatePart();
            part.setTemplate(template);
            part.setTitle(partRequest.getTitle());
            part.setSeqNumber(seq++);
            part.setNumberOfQuestions(partRequest.getNumberOfQuestions());
            part.setQuestionType(partRequest.getQuestionType());

            if (partRequest.getTopicIds() != null) {
                List<Topic> topics = topicRepository.findAllById(partRequest.getTopicIds());
                part.setTopics(topics);
            }

            part = templatePartRepository.save(part);

            if (partRequest.getDifficulties() != null) {
                for (TemplatePartDifficultyRequest diffRequest : partRequest.getDifficulties()) {
                    TemplatePartDifficulty diff = new TemplatePartDifficulty();
                    diff.setTemplatePart(part);
                    diff.setDifficulty(diffRequest.getDifficulty());
                    diff.setDifficultyValue(diffRequest.getDifficultyValue());
                    templatePartDifficultyRepository.save(diff);
                }
            }
        }
    }

    private TemplateResponse mapToResponse(Template template) {
        List<TemplatePart> parts = template.getTemplateParts() != null
                ? template.getTemplateParts()
                : new ArrayList<>();

        List<TemplatePartResponse> partResponses = parts.stream()
                .sorted((a, b) -> Integer.compare(a.getSeqNumber(), b.getSeqNumber()))
                .map(part -> {
                    List<TemplatePartTopicResponse> topicResponses = part.getTopics() != null
                            ? part.getTopics().stream()
                                    .map(t -> TemplatePartTopicResponse.builder()
                                            .id(t.getId())
                                            .name(t.getName())
                                            .build())
                                    .collect(Collectors.toList())
                            : new ArrayList<>();

                    return TemplatePartResponse.builder()
                            .id(part.getId())
                            .title(part.getTitle())
                            .seqNumber(part.getSeqNumber())
                            .numberOfQuestions(part.getNumberOfQuestions())
                            .questionType(part.getQuestionType() != null ? part.getQuestionType().name() : null)
                            .topics(topicResponses)
                            .build();
                })
                .collect(Collectors.toList());

        return TemplateResponse.builder()
                .id(template.getId())
                .title(template.getTitle())
                .subjectId(template.getSubject().getId())
                .subjectName(template.getSubject().getName())
                .parts(partResponses)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
