package xyz.tuanhoang04.EPMS.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.tuanhoang04.EPMS.dto.requests.TemplatePartDifficultyRequest;
import xyz.tuanhoang04.EPMS.dto.requests.TemplatePartRequest;
import xyz.tuanhoang04.EPMS.dto.requests.TemplateRequest;
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
            int seq = 1;
            for (TemplatePartRequest partRequest : request.getParts()) {
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

        return mapToResponse(templateRepository.save(template));
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        templateRepository.deleteById(id);
    }

    private TemplateResponse mapToResponse(Template template) {
        return TemplateResponse.builder()
                .id(template.getId())
                .title(template.getTitle())
                .subjectId(template.getSubject().getId())
                .subjectName(template.getSubject().getName())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
