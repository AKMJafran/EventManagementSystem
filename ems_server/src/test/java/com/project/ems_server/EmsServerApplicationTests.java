package com.project.ems_server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@SpringBootTest
class EmsServerApplicationTests {

	@Test
	void contextLoads() {
	}

	@Configuration(proxyBeanMethods = false)
	static class TestConfig {

		@Bean
		public JavaMailSender javaMailSender() {
			return new JavaMailSenderImpl();
		}
	}

}
