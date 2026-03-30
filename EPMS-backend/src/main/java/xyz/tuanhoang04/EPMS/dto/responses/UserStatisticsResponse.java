package xyz.tuanhoang04.EPMS.dto.responses;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UserStatisticsResponse {
    private long subjectCount;
    private long topicCount;
    private long questionCount;
    private long templateCount;
    private long examHistoryCount;
}
