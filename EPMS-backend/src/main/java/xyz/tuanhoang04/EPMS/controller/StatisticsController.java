package xyz.tuanhoang04.EPMS.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.tuanhoang04.EPMS.dto.responses.UserStatisticsResponse;
import xyz.tuanhoang04.EPMS.service.StatisticsService;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/me")
    public UserStatisticsResponse getMyStatistics(Authentication authentication) {
        return statisticsService.getUserStatistics(authentication.getName());
    }
}
