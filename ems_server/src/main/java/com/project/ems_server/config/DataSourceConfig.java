package com.project.ems_server.config;

import javax.sql.DataSource;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSourceConfig {

    /**
     * Explicit DataSource bean definition with spring.datasource.* binding.
     * This is automatically singleton-scoped in Spring Boot.
     *
     * Using DataSourceProperties to ensure proper URL/driver binding.
     */
    @Bean
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource dataSource(DataSourceProperties dataSourceProperties) {
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }
}
