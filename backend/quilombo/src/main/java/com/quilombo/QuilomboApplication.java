package com.quilombo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class QuilomboApplication {

	public static void main(String[] args) {
		SpringApplication.run(QuilomboApplication.class, args);
	}

}
