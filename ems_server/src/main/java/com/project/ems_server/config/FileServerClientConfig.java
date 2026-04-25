package com.project.ems_server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class FileServerClientConfig {

    @Bean
    @Primary
    public RestTemplate restTemplate(
            @Value("${fileserver.connect-timeout-ms:5000}") long connectTimeoutMs,
            @Value("${fileserver.read-timeout-ms:15000}") long readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) connectTimeoutMs);
        requestFactory.setReadTimeout((int) readTimeoutMs);
        return new RestTemplate(requestFactory);
    }
}
