package xyz.tuanhoang04.EPMS.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        // Ensure binary (docx) responses are accepted regardless of Content-Type
        ByteArrayHttpMessageConverter byteConverter = new ByteArrayHttpMessageConverter();
        byteConverter.setSupportedMediaTypes(List.of(MediaType.ALL));
        restTemplate.getMessageConverters().add(0, byteConverter);

        return restTemplate;
    }
}
